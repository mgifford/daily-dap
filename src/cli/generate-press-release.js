#!/usr/bin/env node
/**
 * Generates a plain-text press release (news release) summarizing the top
 * accessibility barriers found in today's daily DAP scan.
 *
 * Reads report.json and axe-findings.json from docs/reports/daily/YYYY-MM-DD/
 * and writes a Markdown news release suitable for adaptation into a
 * communications product.
 *
 * Output: press-release.md written to the daily report directory (and/or stdout).
 *
 * Usage:
 *   node src/cli/generate-press-release.js [--output-root <dir>] [--date YYYY-MM-DD]
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { getPolicyNarrative } from '../data/axe-impact-loader.js';

const BASE_REPORT_URL = 'https://mgifford.github.io/daily-dap/docs/reports/daily';

function getDefaultRepoRoot() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(currentDir, '..', '..');
}

function parseArgs(argv) {
  const args = { repoRoot: null, runDate: null };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--output-root') args.repoRoot = argv[++i];
    else if (argv[i] === '--date') args.runDate = argv[++i];
  }
  return args;
}

/**
 * Aggregate axe findings from axe-findings.json URLs into a sorted list
 * of { id, title, count, total_page_loads, affected_urls[] }.
 */
function buildAxePatternCounts(urls = []) {
  const counts = new Map();
  for (const entry of urls) {
    const pageLoads = entry.page_load_count ?? 0;
    const url = entry.url ?? '';
    for (const finding of entry.axe_findings ?? []) {
      const existing = counts.get(finding.id);
      if (existing) {
        existing.count += 1;
        existing.total_page_loads += pageLoads;
        if (url) existing.affected_urls.push(url);
      } else {
        counts.set(finding.id, {
          id: finding.id,
          title: finding.title ?? finding.id,
          count: 1,
          total_page_loads: pageLoads,
          affected_urls: url ? [url] : []
        });
      }
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count);
}

/**
 * Format a number with comma separators (locale-style).
 */
function fmt(n) {
  return Number(n).toLocaleString('en-US');
}

/**
 * Return a human-readable date string from a YYYY-MM-DD date string.
 */
function humanDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/**
 * Build the FPC exclusion summary section.
 * Returns an array of markdown lines.
 *
 * @param {object} fpcExclusion - report.fpc_exclusion object
 */
function buildFpcExclusionSection(fpcExclusion) {
  if (!fpcExclusion || !fpcExclusion.categories) {
    return [];
  }

  const lines = [];
  lines.push('## Americans Being Left Out');
  lines.push('');
  lines.push(
    'Based on page traffic data and U.S. Census disability prevalence estimates ' +
    '(ACS 2022), today\'s accessibility barriers are estimated to affect the ' +
    'following groups of Americans:'
  );
  lines.push('');
  lines.push('| Disability Group | Affected Page Loads | Estimated People Affected |');
  lines.push('|-----------------|---------------------|--------------------------|');

  const entries = Object.entries(fpcExclusion.categories)
    .filter(([, cat]) => cat.affected_page_loads > 0)
    .sort(([, a], [, b]) => b.estimated_excluded_users - a.estimated_excluded_users);

  if (entries.length === 0) {
    lines.push('| No affected groups identified | -- | -- |');
  } else {
    for (const [, cat] of entries) {
      lines.push(
        `| ${cat.label} | ${fmt(cat.affected_page_loads)} | ~${fmt(Math.round(cat.estimated_excluded_users))} |`
      );
    }
  }

  lines.push('');
  lines.push(
    `*Total page loads across all scanned URLs today: ${fmt(fpcExclusion.total_page_loads ?? 0)}*`
  );
  lines.push('');
  lines.push(
    '*Estimates use disability prevalence rates from the U.S. Census Bureau ' +
    'American Community Survey (ACS) 2022, supplemented by CDC, NIDCD, AFB, ' +
    'and NIH/NEI data. These are rough estimates intended to illustrate the scale ' +
    'of accessibility barriers, not precise measurements.*'
  );
  lines.push('');

  return lines;
}

/**
 * Build the top accessibility barriers section with human-impact narratives.
 * Returns an array of markdown lines.
 *
 * @param {Array<{ id: string, title: string, count: number, total_page_loads: number, affected_urls: string[] }>} topPatterns
 *   Sorted array of axe pattern counts (e.g. from buildAxePatternCounts), already sliced to top N.
 * @returns {string[]} Array of markdown lines
 */
function buildTopBarriersSection(topPatterns) {
  if (topPatterns.length === 0) return [];

  const lines = [];
  lines.push('## Top Accessibility Barriers');
  lines.push('');
  lines.push(
    'The following accessibility issues were most frequently found across today\'s scanned ' +
    'government websites. Each issue prevents specific groups of Americans from independently ' +
    'accessing government services.'
  );
  lines.push('');

  let issueIndex = 1;
  for (const pattern of topPatterns) {
    const narrative = getPolicyNarrative(pattern.id);
    const siteCount = pattern.count;
    const sitePlural = siteCount === 1 ? 'website' : 'websites';
    const title = narrative ? narrative.title : pattern.title;

    lines.push(`### ${issueIndex}. \`${pattern.id}\`: ${title}`);
    lines.push('');
    lines.push(`*Found on ${fmt(siteCount)} government ${sitePlural} today*`);
    lines.push('');

    if (narrative && narrative.why_it_matters) {
      lines.push(narrative.why_it_matters.trim());
      lines.push('');
    }

    if (narrative && Array.isArray(narrative.affected_demographics) && narrative.affected_demographics.length > 0) {
      lines.push('**Affected groups:**');
      lines.push('');
      for (const group of narrative.affected_demographics) {
        lines.push(`- ${group}`);
      }
      lines.push('');
    }

    issueIndex += 1;
  }

  return lines;
}

/**
 * Build a full press-release Markdown document from a report and axe findings.
 *
 * @param {object} report - Parsed report.json object
 * @param {object} axeData - Parsed axe-findings.json object
 * @param {object} [options]
 * @param {number} [options.topN=5] - Number of top issues to include
 * @returns {string} Markdown press release text
 */
export function buildPressRelease(report, axeData, options = {}) {
  const topN = options.topN ?? 5;
  const runDate = report.run_date ?? '';
  const reportUrl = `${BASE_REPORT_URL}/${runDate}/index.html`;
  const axeJsonUrl = `${BASE_REPORT_URL}/${runDate}/axe-findings.json`;
  const axeCsvUrl = `${BASE_REPORT_URL}/${runDate}/axe-findings.csv`;

  const urlCounts = report.url_counts ?? {};
  const succeeded = urlCounts.succeeded ?? 0;
  const processed = urlCounts.processed ?? 0;
  const scores = report.aggregate_scores ?? {};

  const patterns = buildAxePatternCounts(axeData.urls ?? []);
  const topPatterns = patterns.slice(0, topN);
  const totalFindings = axeData.total_findings ?? 0;

  const lines = [];

  // Header
  lines.push('FOR IMMEDIATE RELEASE');
  lines.push('');

  // Title
  lines.push(`# U.S. Government Website Accessibility Report: ${humanDate(runDate)}`);
  lines.push('');

  // Lead paragraph
  const topIssueNames = topPatterns.slice(0, 3).map((p) => {
    const narrative = getPolicyNarrative(p.id);
    return narrative ? narrative.title : p.id;
  });
  const issueList = topIssueNames.length > 0
    ? new Intl.ListFormat('en-US', { style: 'long', type: 'conjunction' }).format(topIssueNames)
    : 'accessibility barriers';

  lines.push(
    `*Washington, D.C. -- ${humanDate(runDate)}* -- A daily scan of ${fmt(succeeded)} of the ` +
    `most-visited U.S. government websites found ${fmt(totalFindings)} accessibility ` +
    `barriers across ${fmt(processed)} URLs today. The most common issues include ` +
    `${issueList}.`
  );
  lines.push('');
  lines.push(
    'These barriers prevent Americans with disabilities from independently accessing ' +
    'essential government services. This is a single daily snapshot of the most popular ' +
    `~${fmt(processed)} pages in U.S. federal government web properties, as measured by ` +
    'the Digital Analytics Program (DAP).'
  );
  lines.push('');

  // FPC exclusion section
  const fpcLines = buildFpcExclusionSection(report.fpc_exclusion);
  lines.push(...fpcLines);

  // Top barriers section
  const barriersLines = buildTopBarriersSection(topPatterns);
  lines.push(...barriersLines);

  // Scores section
  lines.push('## Accessibility Scores');
  lines.push('');
  lines.push(
    `Aggregate Lighthouse scores across ${fmt(succeeded)} scanned U.S. government ` +
    'websites today:'
  );
  lines.push('');
  lines.push('| Metric | Score |');
  lines.push('|--------|-------|');
  lines.push(`| Accessibility | ${scores.accessibility ?? 0} |`);
  lines.push(`| Performance | ${scores.performance ?? 0} |`);
  lines.push(`| Best Practices | ${scores.best_practices ?? 0} |`);
  lines.push(`| SEO | ${scores.seo ?? 0} |`);
  lines.push('');

  // About section
  lines.push('## About This Report');
  lines.push('');
  lines.push(
    'This report captures a daily snapshot of the most-visited U.S. government web pages ' +
    'as measured by the Digital Analytics Program (DAP). Scans use Lighthouse (Google\'s ' +
    'automated web quality tool, which includes axe-core for accessibility testing). ' +
    'Reports are published automatically each day.'
  );
  lines.push('');
  lines.push(`- [View full interactive report](${reportUrl})`);
  lines.push(`- [Download accessibility findings (JSON)](${axeJsonUrl})`);
  lines.push(`- [Download accessibility findings (CSV)](${axeCsvUrl})`);
  lines.push('');

  // Footer
  lines.push('---');
  lines.push('');
  lines.push(
    `*Generated by [Daily DAP](https://github.com/mgifford/daily-dap) | ` +
    `Source: Digital Analytics Program | ` +
    `Methodology: Lighthouse + axe-core | ` +
    `Date: ${runDate}*`
  );

  return lines.join('\n');
}

/**
 * Read data files and generate a press release for the given date.
 *
 * @param {string} repoRoot - Absolute path to the repository root
 * @param {string|null} runDate - YYYY-MM-DD date string, or null to use latest
 * @returns {Promise<{ markdown: string, outputPath: string }>}
 */
export async function generatePressRelease(repoRoot, runDate) {
  const reportsRoot = path.join(repoRoot, 'docs', 'reports');

  let reportDate = runDate;
  if (!reportDate) {
    const historyRaw = await fs.readFile(path.join(reportsRoot, 'history.json'), 'utf8');
    const history = JSON.parse(historyRaw);
    reportDate = history.entries?.[0]?.run_date;
  }

  if (!reportDate) {
    throw new Error('Could not determine report date. Pass --date or ensure history.json exists.');
  }

  const dailyDir = path.join(reportsRoot, 'daily', reportDate);
  const [reportRaw, axeRaw] = await Promise.all([
    fs.readFile(path.join(dailyDir, 'report.json'), 'utf8'),
    fs.readFile(path.join(dailyDir, 'axe-findings.json'), 'utf8')
  ]);

  const report = JSON.parse(reportRaw);
  const axeData = JSON.parse(axeRaw);

  const markdown = buildPressRelease(report, axeData);
  const outputPath = path.join(dailyDir, 'press-release.md');

  return { markdown, outputPath };
}

async function main() {
  const args = parseArgs(process.argv);
  const repoRoot = path.resolve(args.repoRoot ?? getDefaultRepoRoot());
  const { markdown, outputPath } = await generatePressRelease(repoRoot, args.runDate ?? null);

  await fs.writeFile(outputPath, `${markdown}\n`, 'utf8');
  console.log(`Press release written to ${outputPath}`);

  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    await fs.appendFile(summaryPath, `\n${markdown}\n`, 'utf8');
    console.log('Press release appended to GITHUB_STEP_SUMMARY');
  } else {
    console.log('');
    console.log(markdown);
  }
}

const isDirectExecution = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectExecution) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
