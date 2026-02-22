#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadPrevalenceConfig, applyRuntimeOverrides } from '../config/prevalence-loader.js';
import { getNormalizedTopPages } from '../ingest/dap-source.js';
import { createRunMetadata } from '../lib/run-metadata.js';
import { createWarningEvent } from '../lib/logging.js';
import { executeUrlScans } from '../scanners/execution-manager.js';
import { aggregateCategoryScores } from '../aggregation/score-aggregation.js';
import { buildSlowRiskRollup } from '../aggregation/slow-risk.js';
import { estimateWeightedImpact } from '../aggregation/impact-estimation.js';
import { estimateCategoryImpact } from '../aggregation/prevalence-impact.js';
import { buildHistorySeries } from '../aggregation/history-series.js';
import { buildDailyReport } from '../publish/build-daily-report.js';
import { buildHistoryIndex } from '../publish/build-history-index.js';
import { writeCommittedSnapshot } from '../publish/archive-writer.js';
import { buildArtifactManifest } from '../publish/artifact-manifest.js';
import { buildFailureReport, writeFailureSnapshot } from '../publish/failure-report.js';

function parseArgs(argv) {
  const args = {
    dryRun: false,
    configPath: null,
    sourceFile: null,
    urlLimit: undefined,
    trafficWindowMode: undefined,
    runDate: undefined,
    scanMode: 'mock',
    mockFailUrl: [],
    outputRoot: null,
    dapApiKey: undefined,
    concurrency: 4,
    timeoutMs: 20000,
    maxRetries: 1
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

function scoreFromUrl(url, base = 70) {
  let total = 0;
  for (const char of url) {
    total += char.charCodeAt(0);
  }

  const bounded = (total % 31) + base;
  return Math.max(0, Math.min(100, bounded));
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

        return {
          categories: {
            performance: { score: performance },
            accessibility: { score: accessibility },
            'best-practices': { score: bestPractices },
            seo: { score: seo },
            pwa: { score: pwa }
          },
          audits: {
            'largest-contentful-paint': { score: performance },
            'cumulative-layout-shift': { score: seo },
            'interaction-to-next-paint': { score: bestPractices }
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
  const repoRoot = path.resolve(args.outputRoot ?? getDefaultRepoRoot());
  const configPath = args.configPath ?? getDefaultConfigPath();
  const dapApiKey = args.dapApiKey ?? process.env.DAP_API_KEY;

  let runMetadata;

  try {
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

    const dapEndpoint = runtimeConfig.sources?.dap_top_pages_endpoint;
    if (!args.sourceFile && dapEndpoint?.includes('api.gsa.gov') && !dapApiKey) {
      throw new Error('DAP_API_KEY is required to fetch top pages from api.gsa.gov. Set repo secret DAP_API_KEY or pass --dap-api-key.');
    }

    const normalized = await getNormalizedTopPages({
      endpoint: dapEndpoint,
      sourceFile: args.sourceFile,
      limit: runtimeConfig.scan.url_limit,
      sourceDate: runMetadata.run_date,
      dapApiKey
    });

    const warningEvents = normalized.warnings.map((warning) =>
      createWarningEvent(warning.code, warning.message, { url: warning.url })
    );

    if (args.dryRun) {
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

    if (args.scanMode !== 'mock') {
      throw new Error(`Unsupported scan mode: ${args.scanMode}. Currently supported: mock`);
    }

    const { lighthouseRunner, scanGovRunner } = createMockScannerRunners(args.mockFailUrl);
    const scanExecution = await executeUrlScans(normalized.records, {
      runId: runMetadata.run_id,
      concurrency: args.concurrency,
      timeoutMs: args.timeoutMs,
      maxRetries: args.maxRetries,
      lighthouseRunner,
      scanGovRunner,
      excludePredicate: (record) => (record.page_load_count === null ? 'excluded_missing_page_load_count' : null)
    });

    const scoreSummary = aggregateCategoryScores(scanExecution.results);
    const slowRisk = buildSlowRiskRollup(scanExecution.results);
    const weightedImpact = estimateWeightedImpact(scanExecution.results, runtimeConfig, {
      trafficWindowMode: runtimeConfig.scan.traffic_window_mode
    });
    const prevalenceImpact = estimateCategoryImpact(weightedImpact, runtimeConfig.impact.prevalence_rates);

    const historyContext = await loadHistoryRecords(repoRoot, runtimeConfig.scan.history_lookback_days);
    const historyWindow = buildHistorySeries(historyContext.records, {
      runDate: runMetadata.run_date,
      trafficWindowMode: runtimeConfig.scan.traffic_window_mode,
      windowDays: runtimeConfig.scan.history_lookback_days
    });

    const report = buildDailyReport({
      runMetadata,
      scoreSummary,
      weightedImpact,
      prevalenceImpact,
      historyWindow,
      urlResults: scanExecution.results
    });

    report.slow_risk_summary = slowRisk.summary;
    report.warning_events = warningEvents;
    report.scan_diagnostics = scanExecution.diagnostics;

    const historyIndex = buildHistoryIndex(historyContext.historyIndex.entries ?? [], report, {
      lookbackDays: runtimeConfig.scan.history_lookback_days
    });

    const snapshotPaths = await writeCommittedSnapshot({
      repoRoot,
      report,
      historyIndex,
      dashboardContext: {
        historyEntries: historyIndex.entries
      }
    });

    const artifactManifest = buildArtifactManifest({
      runId: report.run_id,
      runDate: report.run_date,
      report,
      historyIndex
    });

    const manifestPath = path.join(repoRoot, 'docs', 'reports', 'daily', report.run_date, 'artifact-manifest.json');
    await fs.writeFile(manifestPath, `${JSON.stringify(artifactManifest, null, 2)}\n`, 'utf8');

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
