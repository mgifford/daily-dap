#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadPrevalenceConfig, applyRuntimeOverrides } from '../config/prevalence-loader.js';
import { getNormalizedTopPages } from '../ingest/dap-source.js';
import { createRunMetadata } from '../lib/run-metadata.js';
import { createWarningEvent, logProgress, logStageStart, logStageComplete } from '../lib/logging.js';
import { executeUrlScans } from '../scanners/execution-manager.js';
import { aggregateCategoryScores } from '../aggregation/score-aggregation.js';
import { buildSlowRiskRollup } from '../aggregation/slow-risk.js';
import { estimateWeightedImpact } from '../aggregation/impact-estimation.js';
import { estimateCategoryImpact } from '../aggregation/prevalence-impact.js';
import { computeFpcExclusion } from '../aggregation/fpc-exclusion.js';
import { buildPerformanceImpact } from '../aggregation/performance-impact.js';
import { isCensusDataStale } from '../data/census-disability-stats.js';
import { buildHistorySeries } from '../aggregation/history-series.js';
import { buildDailyReport } from '../publish/build-daily-report.js';
import { loadDotgovData } from '../data/dotgov-lookup.js';
import { buildHistoryIndex } from '../publish/build-history-index.js';
import { writeCommittedSnapshot } from '../publish/archive-writer.js';
import { buildArtifactManifest } from '../publish/artifact-manifest.js';
import { buildFailureReport, writeFailureSnapshot } from '../publish/failure-report.js';
import { checkAccessibilityStatements } from '../scanners/accessibility-statement-checker.js';
import { checkRequiredLinks } from '../scanners/required-links-checker.js';

function parseArgs(argv) {
  const args = {
    dryRun: false,
    configPath: null,
    sourceFile: null,
    urlLimit: undefined,
    trafficWindowMode: undefined,
    runDate: undefined,
    scanMode: 'live',
    mockFailUrl: [],
    outputRoot: null,
    dapApiKey: undefined,
    concurrency: 2,
    timeoutMs: 90_000,
    maxRetries: 2,
    retryDelayMs: 2000,
    interScanDelayMs: 1000
  };

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    switch (token) {
      case '--dry-run':
        args.dryRun = true;
        break;
      case '--config':
        args.configPath = argv[++index];
        break;
      case '--source-file':
        args.sourceFile = argv[++index];
        break;
      case '--limit':
        args.urlLimit = Number(argv[++index]);
        break;
      case '--traffic-window':
        args.trafficWindowMode = argv[++index];
        break;
      case '--date':
        args.runDate = argv[++index];
        break;
      case '--scan-mode':
        args.scanMode = argv[++index];
        break;
      case '--mock-fail-url':
        args.mockFailUrl = argv[++index]
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
        break;
      case '--output-root':
        args.outputRoot = argv[++index];
        break;
      case '--dap-api-key':
        args.dapApiKey = argv[++index];
        break;
      case '--concurrency':
        args.concurrency = Number(argv[++index]);
        break;
      case '--timeout-ms':
        args.timeoutMs = Number(argv[++index]);
        break;
      case '--max-retries':
        args.maxRetries = Number(argv[++index]);
        break;
      case '--retry-delay-ms':
        args.retryDelayMs = Number(argv[++index]);
        break;
      case '--inter-scan-delay-ms':
        args.interScanDelayMs = Number(argv[++index]);
        break;
      default:
        throw new Error(`Unknown argument: ${token}`);
    }
  }

  return args;
}

function getDefaultConfigPath() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(currentDir, '../config/prevalence.yaml');
}

function getDefaultRepoRoot() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(currentDir, '..', '..');
}

/**
 * Returns the effective output root for the scan.
 * If an explicit --output-root was specified, use it.
 * If running in mock mode without an explicit output root, redirect to a temp
 * directory so that test/development scans cannot accidentally overwrite the
 * production docs/reports/ data that was committed by a real CI scan.
 * Live scans always default to the repo root so that reports are committed.
 *
 * @param {{outputRoot: string|null, scanMode: string}} args
 * @returns {string}
 */
function getEffectiveOutputRoot(args) {
  if (args.outputRoot) {
    return path.resolve(args.outputRoot);
  }
  if (args.scanMode === 'mock') {
    return path.join(os.tmpdir(), 'daily-dap-mock');
  }
  return getDefaultRepoRoot();
}

function scoreFromUrl(url, base = 70) {
  let total = 0;
  for (const char of url) {
    total += char.charCodeAt(0);
  }

  const bounded = (total % 31) + base;
  return Math.max(0, Math.min(100, bounded));
}

/**
 * Generate mock network-request items for technology detection.
 * Deterministically assigns a CMS or USWDS presence based on URL seed.
 *
 * seed % 4 === 0 → WordPress
 * seed % 4 === 1 → Drupal
 * seed % 4 === 2 → Joomla (with USWDS)
 * seed % 4 === 3 → USWDS only (no CMS)
 *
 * @param {string} url
 * @param {number} seed
 * @returns {Array<{url: string}>}
 */
function mockNetworkRequests(url, seed) {
  const base = url.replace('https://', '').replaceAll('/', '-');
  const bucket = seed % 4;

  if (bucket === 0) {
    return [
      { url: `${url}/wp-content/themes/federal/style.css` },
      { url: `${url}/wp-includes/js/wp-emoji.js` }
    ];
  }

  if (bucket === 1) {
    return [
      { url: `${url}/sites/default/files/css/main.css` },
      { url: `${url}/core/misc/drupal.js` }
    ];
  }

  if (bucket === 2) {
    return [
      { url: `${url}/components/com_content/views/article/tmpl/default.php` },
      { url: `${url}/assets/uswds/uswds-3.8.0.min.css` }
    ];
  }

  // bucket === 3: USWDS only
  return [{ url: `${base}-cdn/uswds@3.6.1/dist/css/uswds.min.css` }];
}

function createMockScannerRunners(failNeedles = []) {
  const shouldFail = (url) => failNeedles.some((needle) => url.includes(needle));

  return {
    lighthouseRunner: {
      runImpl: async (url) => {
        if (shouldFail(url)) {
          throw new Error(`Mock lighthouse failure for ${url}`);
        }

        const performance = scoreFromUrl(url, 65) / 100;
        const accessibility = scoreFromUrl(url, 75) / 100;
        const bestPractices = scoreFromUrl(url, 70) / 100;
        const seo = scoreFromUrl(url, 72) / 100;
        const pwa = scoreFromUrl(url, 55) / 100;

        const selectorBase = url.replace('https://', '').replaceAll('/', '-');
        const seed = scoreFromUrl(url, 0);
        const accessibilityAudits = {};
        const accessibilityAuditRefs = [];

        if (seed % 2 === 0) {
          accessibilityAudits['color-contrast'] = {
            id: 'color-contrast',
            title: 'Background and foreground colors do not have a sufficient contrast ratio.',
            description: 'Low-contrast text is difficult or impossible for many users to read. [Learn how to provide sufficient color contrast](https://dequeuniversity.com/rules/axe/4.9/color-contrast).',
            score: 0,
            scoreDisplayMode: 'binary',
            details: {
              type: 'table',
              items: [
                {
                  node: {
                    type: 'node',
                    selector: `#${selectorBase}-header`,
                    snippet: `<h1 class="header">Page Title</h1>`,
                    nodeLabel: 'Page Title',
                    explanation: 'Fix any of the following:\n  Element has insufficient color contrast of 2.73 (foreground color: #767676, background color: #ffffff, font size: 16px, font weight: normal).'
                  }
                }
              ]
            }
          };
          accessibilityAuditRefs.push({ id: 'color-contrast', weight: 3 });
        }

        if (seed % 3 === 0) {
          accessibilityAudits['aria-label'] = {
            id: 'aria-label',
            title: 'ARIA input fields do not have accessible names.',
            description: 'By default, only the visible label text for form fields is accessible. When using an ARIA role that designates form input, provide an accessible name. [Learn more about ARIA input field labels](https://dequeuniversity.com/rules/axe/4.9/aria-label).',
            score: 0,
            scoreDisplayMode: 'binary',
            details: {
              type: 'table',
              items: [
                {
                  node: {
                    type: 'node',
                    selector: `#${selectorBase}-search`,
                    snippet: `<input type="search" role="searchbox" />`,
                    nodeLabel: '',
                    explanation: 'Fix any of the following:\n  aria-label attribute does not exist or is empty.'
                  }
                }
              ]
            }
          };
          accessibilityAuditRefs.push({ id: 'aria-label', weight: 7 });
        }

        return {
          categories: {
            performance: { score: performance },
            accessibility: { score: accessibility, auditRefs: accessibilityAuditRefs },
            'best-practices': { score: bestPractices },
            seo: { score: seo },
            pwa: { score: pwa }
          },
          audits: {
            'largest-contentful-paint': { score: performance, numericValue: Math.round((1 - performance) * 8000 + 1000) },
            'cumulative-layout-shift': { score: seo },
            'interaction-to-next-paint': { score: bestPractices },
            'total-byte-weight': { numericValue: Math.round((1 - performance) * 3000000 + 500000) },
            'network-requests': {
              details: {
                items: mockNetworkRequests(url, seed)
              }
            },
            ...accessibilityAudits
          }
        };
      }
    },
    scanGovRunner: {
      runImpl: async (url) => {
        if (shouldFail(url)) {
          throw new Error(`Mock ScanGov failure for ${url}`);
        }

        const findings = [];
        const selectorBase = url.replace('https://', '').replaceAll('/', '-');
        const seed = scoreFromUrl(url, 0);

        if (seed % 2 === 0) {
          findings.push({
            code: 'color-contrast',
            category: 'perceivable',
            severity: 'serious',
            message: 'Insufficient contrast in foreground/background pair',
            selector: `#${selectorBase}-header`
          });
        }

        if (seed % 3 === 0) {
          findings.push({
            code: 'aria-label',
            category: 'understandable',
            severity: 'moderate',
            message: 'Form input missing accessible name',
            selector: `#${selectorBase}-search`
          });
        }

        return { issues: findings };
      }
    }
  };
}

function createLiveScannerRunners() {
  return {
    lighthouseRunner: {
      executionOptions: {}
    },
    scanGovRunner: {
      runImpl: async () => ({ issues: [] })
    }
  };
}

/**
 * Deterministic mock for accessibility statement checks.
 * Approximately two-thirds of domains are assigned a statement based on a
 * character-sum hash so results are stable across multiple runs of the same
 * URL list.
 *
 * @param {string} baseUrl
 * @returns {Promise<{ has_statement: boolean, statement_url: string|null }>}
 */
function mockAccessibilityStatementCheck(baseUrl) {
  let sum = 0;
  for (const char of baseUrl) {
    sum += char.charCodeAt(0);
  }
  const hasStatement = sum % 3 !== 0;
  return Promise.resolve({
    has_statement: hasStatement,
    statement_url: hasStatement ? `${baseUrl}/accessibility` : null
  });
}

/**
 * Mock runner for required links checks used when scan-mode is "mock".
 * Deterministically assigns link presence based on baseUrl + linkType hash
 * so that the same URL always produces the same result across the mock URL list.
 *
 * @param {string} baseUrl
 * @param {string} linkType
 * @returns {Promise<{ found: boolean, url: string|null }>}
 */
function mockRequiredLinkCheck(baseUrl, linkType) {
  let sum = 0;
  for (const char of baseUrl + linkType) {
    sum += char.charCodeAt(0);
  }
  const found = sum % 4 !== 0;
  const pathMap = { privacy: '/privacy', contact: '/contact', foia: '/foia' };
  return Promise.resolve({
    found,
    url: found ? `${baseUrl}${pathMap[linkType] ?? '/'}` : null
  });
}

async function loadHistoryRecords(repoRoot, lookbackDays) {
  const historyPath = path.join(repoRoot, 'docs', 'reports', 'history.json');
  let historyPayload;

  try {
    const raw = await fs.readFile(historyPath, 'utf8');
    historyPayload = JSON.parse(raw);
  } catch {
    return { historyIndex: { generated_at: null, lookback_days: lookbackDays, entries: [] }, records: [] };
  }

  const records = [];
  for (const entry of historyPayload.entries ?? []) {
    if (!entry?.run_date) {
      continue;
    }

    const reportPath = path.join(repoRoot, 'docs', 'reports', 'daily', entry.run_date, 'report.json');
    try {
      const reportRaw = await fs.readFile(reportPath, 'utf8');
      const report = JSON.parse(reportRaw);
      records.push({
        run_date: report.run_date,
        aggregate_scores: report.aggregate_scores
      });
    } catch {
      records.push({
        run_date: entry.run_date,
        aggregate_scores: {
          performance: 0,
          accessibility: 0,
          best_practices: 0,
          seo: 0,
          pwa: 0
        }
      });
    }
  }

  return { historyIndex: historyPayload, records };
}

async function writeArtifacts(repoRoot, runDate, payload) {
  const outputDir = path.join(repoRoot, 'artifacts', runDate);
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'run-summary.json');
  await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return outputPath;
}

function toAggregateScoreSeries(historySeries = []) {
  return historySeries.map((entry) => ({
    run_date: entry.date,
    aggregate_scores: entry.aggregate_scores
  }));
}

export async function runDailyScan(inputArgs = parseArgs(process.argv)) {
  const args = inputArgs;
  const repoRoot = getEffectiveOutputRoot(args);
  const configPath = args.configPath ?? getDefaultConfigPath();
  const dapApiKey = args.dapApiKey ?? process.env.DAP_API_KEY;

  let runMetadata;

  try {
    logStageStart('INITIALIZATION', { scanMode: args.scanMode, dryRun: args.dryRun });

    if (args.scanMode === 'mock' && !args.outputRoot) {
      logProgress('INITIALIZATION', 'Mock scan: writing to temp directory to protect production data', { outputRoot: repoRoot });
    }
    
    const baseConfig = await loadPrevalenceConfig(configPath);
    const runtimeConfig = applyRuntimeOverrides(baseConfig, {
      urlLimit: args.urlLimit,
      trafficWindowMode: args.trafficWindowMode
    });

    runMetadata = createRunMetadata({
      runDate: args.runDate,
      trafficWindowMode: runtimeConfig.scan.traffic_window_mode,
      urlLimit: runtimeConfig.scan.url_limit,
      source: 'dap'
    });

    logProgress('INITIALIZATION', 'Run metadata created', { 
      runId: runMetadata.run_id, 
      runDate: runMetadata.run_date,
      urlLimit: runtimeConfig.scan.url_limit,
      trafficWindow: runtimeConfig.scan.traffic_window_mode
    });

    const dapEndpoint = runtimeConfig.sources?.dap_top_pages_endpoint;
    if (!args.sourceFile && dapEndpoint?.includes('api.gsa.gov') && !dapApiKey) {
      throw new Error('DAP_API_KEY is required to fetch top pages from api.gsa.gov. Set repo secret DAP_API_KEY or pass --dap-api-key.');
    }

    logStageStart('INGEST', { 
      source: args.sourceFile ? 'file' : 'api',
      endpoint: args.sourceFile || dapEndpoint 
    });

    const normalized = await getNormalizedTopPages({
      endpoint: dapEndpoint,
      sourceFile: args.sourceFile,
      limit: runtimeConfig.scan.url_limit,
      sourceDate: runMetadata.run_date,
      dapApiKey
    });

    logStageComplete('INGEST', {
      recordCount: normalized.records.length,
      warningCount: normalized.warnings.length,
      excludedCount: normalized.excluded.length
    });

    const warningEvents = normalized.warnings.map((warning) =>
      createWarningEvent(warning.code, warning.message, { url: warning.url })
    );

    if (args.dryRun) {
      logProgress('DRY_RUN', 'Exiting in dry-run mode');
      const preview = {
        mode: 'dry-run',
        run_metadata: runMetadata,
        counts: {
          normalized_record_count: normalized.records.length,
          warning_count: warningEvents.length,
          excluded_count: normalized.excluded.length
        }
      };
      await writeArtifacts(repoRoot, runMetadata.run_date, preview);
      return preview;
    }

    if (!['mock', 'live'].includes(args.scanMode)) {
      throw new Error(`Unsupported scan mode: ${args.scanMode}. Currently supported: live, mock`);
    }

    logStageStart('SCAN', {
      mode: args.scanMode,
      urlCount: normalized.records.length,
      concurrency: args.concurrency,
      timeoutMs: args.timeoutMs,
      maxRetries: args.maxRetries,
      retryDelayMs: args.retryDelayMs,
      interScanDelayMs: args.interScanDelayMs
    });

    const { lighthouseRunner, scanGovRunner } =
      args.scanMode === 'mock' ? createMockScannerRunners(args.mockFailUrl) : createLiveScannerRunners();
    const scanExecution = await executeUrlScans(normalized.records, {
      runId: runMetadata.run_id,
      concurrency: args.concurrency,
      timeoutMs: args.timeoutMs,
      maxRetries: args.maxRetries,
      retryDelayMs: args.retryDelayMs,
      interScanDelayMs: args.interScanDelayMs,
      lighthouseRunner,
      scanGovRunner,
      excludePredicate: (record) => (record.page_load_count === null ? 'excluded_missing_page_load_count' : null)
    });

    logStageComplete('SCAN', {
      totalResults: scanExecution.results.length,
      successCount: scanExecution.diagnostics.success_count,
      failureCount: scanExecution.diagnostics.failure_count,
      excludedCount: scanExecution.diagnostics.excluded_count
    });

    logStageStart('AGGREGATION');

    const scoreSummary = aggregateCategoryScores(scanExecution.results);
    logProgress('AGGREGATION', 'Category scores aggregated');

    const slowRisk = buildSlowRiskRollup(scanExecution.results);
    logProgress('AGGREGATION', 'Slow risk rollup built');

    const weightedImpact = estimateWeightedImpact(scanExecution.results, runtimeConfig, {
      trafficWindowMode: runtimeConfig.scan.traffic_window_mode
    });
    logProgress('AGGREGATION', 'Weighted impact estimated');

    const prevalenceImpact = estimateCategoryImpact(weightedImpact, runtimeConfig.impact.prevalence_rates);
    logProgress('AGGREGATION', 'Prevalence impact estimated');

    const fpcExclusion = computeFpcExclusion(scanExecution.results);
    logProgress('AGGREGATION', 'FPC exclusion computed');

    const performanceImpact = buildPerformanceImpact(scanExecution.results);
    logProgress('AGGREGATION', 'Performance impact calculated');

    if (isCensusDataStale()) {
      logProgress('AGGREGATION', 'WARNING: Census disability data may be stale. Review src/data/census-disability-stats.js and update with the latest ACS data.');
    }

    logStageComplete('AGGREGATION');

    logStageStart('ACCESSIBILITY_STATEMENTS');

    const accessibilityStatementRunner =
      args.scanMode === 'mock'
        ? { runImpl: mockAccessibilityStatementCheck }
        : {};
    const accessibilityStatements = await checkAccessibilityStatements(
      scanExecution.results,
      accessibilityStatementRunner
    );
    logProgress('ACCESSIBILITY_STATEMENTS', 'Accessibility statement checks complete', {
      domainsChecked: Object.keys(accessibilityStatements).length
    });

    logStageComplete('ACCESSIBILITY_STATEMENTS');

    logStageStart('REQUIRED_LINKS');

    const requiredLinksRunner =
      args.scanMode === 'mock'
        ? { runImpl: mockRequiredLinkCheck }
        : {};
    const requiredLinks = await checkRequiredLinks(
      scanExecution.results,
      requiredLinksRunner
    );
    logProgress('REQUIRED_LINKS', 'Required federal links checks complete', {
      domainsChecked: Object.keys(requiredLinks).length
    });

    logStageComplete('REQUIRED_LINKS');

    logStageStart('HISTORY_LOADING', { 
      lookbackDays: runtimeConfig.scan.history_lookback_days 
    });
    
    const historyContext = await loadHistoryRecords(repoRoot, runtimeConfig.scan.history_lookback_days);
    logProgress('HISTORY_LOADING', 'History records loaded', {
      recordCount: historyContext.records.length
    });

    const historyWindow = buildHistorySeries(historyContext.records, {
      runDate: runMetadata.run_date,
      trafficWindowMode: runtimeConfig.scan.traffic_window_mode,
      windowDays: runtimeConfig.scan.history_lookback_days
    });

    logStageComplete('HISTORY_LOADING', {
      historicalDataPoints: historyWindow.length
    });

    logStageStart('REPORT_BUILDING');

    const dotgovLookup = await loadDotgovData();
    logProgress('REPORT_BUILDING', `Loaded .gov domain registry (${dotgovLookup.size} entries)`);

    const report = buildDailyReport({
      runMetadata,
      scoreSummary,
      weightedImpact,
      prevalenceImpact,
      fpcExclusion,
      historyWindow,
      urlResults: scanExecution.results,
      performanceImpact,
      dotgovLookup,
      accessibilityStatements,
      requiredLinks
    });

    report.slow_risk_summary = slowRisk.summary;
    report.warning_events = warningEvents;
    report.scan_diagnostics = scanExecution.diagnostics;
    report.scan_mode = args.scanMode;
    if (args.scanMode === 'live') {
      report.scanner_notes = [
        'Lighthouse scans are live per URL.',
        'ScanGov integration currently uses placeholder findings and will be wired to a live backend next.'
      ];
    }

    logProgress('REPORT_BUILDING', 'Daily report built');

    const historyIndex = buildHistoryIndex(historyContext.historyIndex.entries ?? [], report, {
      lookbackDays: runtimeConfig.scan.history_lookback_days
    });

    logStageComplete('REPORT_BUILDING', {
      historyEntries: historyIndex.entries.length
    });

    logStageStart('PUBLISHING');

    const displayDays = runtimeConfig.scan.dashboard_display_days ?? 14;

    const snapshotPaths = await writeCommittedSnapshot({
      repoRoot,
      report,
      historyIndex,
      dashboardContext: {
        historyEntries: historyIndex.entries.slice(0, displayDays),
        archiveUrl: historyIndex.entries.length > displayDays ? './archive/index.html' : null,
        archiveWindowDays: displayDays
      }
    });

    logProgress('PUBLISHING', 'Snapshots written', snapshotPaths);

    const artifactManifest = buildArtifactManifest({
      runId: report.run_id,
      runDate: report.run_date,
      report,
      historyIndex
    });

    const manifestPath = path.join(repoRoot, 'docs', 'reports', 'daily', report.run_date, 'artifact-manifest.json');
    await fs.writeFile(manifestPath, `${JSON.stringify(artifactManifest, null, 2)}\n`, 'utf8');

    logProgress('PUBLISHING', 'Artifact manifest written', { path: manifestPath });

    const summary = {
      status: 'success',
      run_metadata: runMetadata,
      counts: report.url_counts,
      paths: {
        ...snapshotPaths,
        artifact_manifest_path: manifestPath
      }
    };

    await writeArtifacts(repoRoot, runMetadata.run_date, {
      ...summary,
      diagnostics: scanExecution.diagnostics
    });

    logStageComplete('PUBLISHING');
    logProgress('PIPELINE', 'All stages completed successfully', {
      runId: runMetadata.run_id,
      runDate: runMetadata.run_date
    });

    return summary;
  } catch (error) {
    const safeRunMetadata =
      runMetadata ??
      createRunMetadata({
        runDate: args.runDate,
        trafficWindowMode: args.trafficWindowMode ?? 'daily',
        urlLimit: Number.isInteger(args.urlLimit) && args.urlLimit > 0 ? args.urlLimit : 1,
        source: 'dap'
      });

    const failurePayload = buildFailureReport({
      runMetadata: safeRunMetadata,
      error
    });

    await writeFailureSnapshot({
      repoRoot,
      failureReport: failurePayload
    });

    await writeArtifacts(repoRoot, safeRunMetadata.run_date, {
      status: 'failed',
      run_metadata: safeRunMetadata,
      failure_report: failurePayload
    });

    throw error;
  }
}

async function main() {
  const summary = await runDailyScan(parseArgs(process.argv));
  console.log(JSON.stringify(summary, null, 2));
}

const isDirectExecution = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
