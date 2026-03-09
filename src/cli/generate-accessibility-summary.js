#!/usr/bin/env node
/**
 * Generates an accessibility summary for GitHub Actions step summaries.
 *
 * Reads the latest axe-findings.json and report.json from docs/reports/daily/
 * and writes a markdown accessibility narrative to GITHUB_STEP_SUMMARY.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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

function buildAxePatternCounts(urls = []) {
  const counts = new Map();
  for (const entry of urls) {
    for (const finding of entry.axe_findings ?? []) {
      const existing = counts.get(finding.id);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(finding.id, { id: finding.id, title: finding.title, count: 1 });
      }
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count);
}

function findPrevEntry(historySeries = [], currentDate) {
  return [...historySeries]
    .reverse()
    .find((entry) => {
      if (entry.date >= currentDate) return false;
      const s = entry.aggregate_scores;
      return s && (s.performance !== 0 || s.accessibility !== 0 || s.best_practices !== 0 || s.seo !== 0);
    });
}

function scoreLine(label, curr, prev) {
  if (prev == null) return `- **${label}**: ${curr}`;
  const delta = Math.round((curr - prev) * 100) / 100;
  const sign = delta >= 0 ? '+' : '';
  return `- **${label}**: ${curr} (${sign}${delta} vs previous day)`;
}

export async function generateAccessibilitySummary(repoRoot, runDate) {
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
  const patterns = buildAxePatternCounts(axeData.urls ?? []);
  const prevEntry = findPrevEntry(report.history_series ?? [], reportDate);

  const prevScores = prevEntry?.aggregate_scores;
  const curr = report.aggregate_scores;

  const lines = [];

  lines.push(`## Accessibility Summary: ${reportDate}`);
  lines.push('');
  lines.push(`**Source**: [DAP Top URLs](https://analytics.usa.gov) - Digital Analytics Program`);
  lines.push(`**Scanned**: ${report.url_counts.succeeded} of ${report.url_counts.processed} URLs succeeded (${report.url_counts.failed} failed)`);
  lines.push('');

  lines.push('### Aggregate Scores');
  lines.push(scoreLine('Performance', curr.performance, prevScores?.performance));
  lines.push(scoreLine('Accessibility', curr.accessibility, prevScores?.accessibility));
  lines.push(scoreLine('Best Practices', curr.best_practices, prevScores?.best_practices));
  lines.push(scoreLine('SEO', curr.seo, prevScores?.seo));
  lines.push('');

  if (patterns.length > 0) {
    lines.push('### Most Common Accessibility Issues');
    lines.push(`Total axe findings today: **${axeData.total_findings}** across ${axeData.total_urls} URLs`);
    lines.push('');
    lines.push('| Rule | Description | URLs Affected |');
    lines.push('|------|-------------|---------------|');
    for (const p of patterns.slice(0, 10)) {
      const escapedTitle = p.title.replaceAll('|', '\\|').replaceAll('`', "'");
      lines.push(`| \`${p.id}\` | ${escapedTitle} | ${p.count} |`);
    }
    lines.push('');
  }

  if (prevScores != null) {
    const accessDelta = Math.round((curr.accessibility - prevScores.accessibility) * 100) / 100;
    const change = accessDelta > 0.5 ? 'improved' : accessDelta < -0.5 ? 'declined' : 'held steady';
    lines.push('### Trend');
    lines.push(`Accessibility scores have **${change}** compared to ${prevEntry.date} (${accessDelta >= 0 ? '+' : ''}${accessDelta} points).`);
    lines.push('');
  }

  lines.push(`[View full report](https://mgifford.github.io/daily-dap/docs/reports/daily/${reportDate}/index.html)`);

  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv);
  const repoRoot = path.resolve(args.repoRoot ?? getDefaultRepoRoot());
  const summary = await generateAccessibilitySummary(repoRoot, args.runDate ?? null);

  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    await fs.appendFile(summaryPath, `\n${summary}\n`, 'utf8');
    console.log(`Accessibility summary written to GITHUB_STEP_SUMMARY`);
  } else {
    console.log(summary);
  }
}

const isDirectExecution = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectExecution) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
