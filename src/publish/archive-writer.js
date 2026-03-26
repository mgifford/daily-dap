import fs from 'node:fs/promises';
import path from 'node:path';
import { renderDailyReportPage, renderDashboardPage, render404Page, renderCodeQualityPage } from './render-pages.js';
import { buildPressRelease } from '../cli/generate-press-release.js';

async function writeJson(filePath, payload) {
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function csvEscape(value) {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Builds a CSV string of daily aggregate Lighthouse scores from the report history series.
 * Columns: date, performance, accessibility, best_practices, seo
 * @param {Array} historySeries - Array of { date, aggregate_scores } objects from report.history_series
 * @returns {string} CSV content with header row and one data row per history entry
 */
function buildHistoryCsv(historySeries = []) {
  const headers = ['date', 'performance', 'accessibility', 'best_practices', 'seo'];
  const rows = [headers.join(',')];

  for (const entry of historySeries) {
    if (!entry.date || !entry.aggregate_scores) continue;
    const { performance, accessibility, best_practices, seo } = entry.aggregate_scores;
    rows.push(
      [
        csvEscape(entry.date),
        csvEscape(performance ?? ''),
        csvEscape(accessibility ?? ''),
        csvEscape(best_practices ?? ''),
        csvEscape(seo ?? '')
      ].join(',')
    );
  }

  return `${rows.join('\n')}\n`;
}

function buildAxeFindingsCsv(axeFindingsReport) {
  const headers = [
    'url',
    'scan_status',
    'finding_id',
    'finding_title',
    'finding_description',
    'finding_score',
    'tags',
    'item_selector',
    'item_snippet',
    'item_node_label',
    'item_explanation'
  ];

  const rows = [headers.join(',')];

  for (const urlEntry of axeFindingsReport.urls) {
    if (!Array.isArray(urlEntry.axe_findings) || urlEntry.axe_findings.length === 0) {
      rows.push(
        [csvEscape(urlEntry.url), csvEscape(urlEntry.scan_status), ...Array(headers.length - 2).fill('')].join(',')
      );
      continue;
    }

    for (const finding of urlEntry.axe_findings) {
      const tags = Array.isArray(finding.tags) ? finding.tags.join(' ') : '';
      const items = Array.isArray(finding.items) && finding.items.length > 0 ? finding.items : [null];

      for (const item of items) {
        rows.push(
          [
            csvEscape(urlEntry.url),
            csvEscape(urlEntry.scan_status),
            csvEscape(finding.id),
            csvEscape(finding.title),
            csvEscape(finding.description),
            csvEscape(finding.score),
            csvEscape(tags),
            csvEscape(item?.selector),
            csvEscape(item?.snippet),
            csvEscape(item?.node_label),
            csvEscape(item?.explanation)
          ].join(',')
        );
      }
    }
  }

  return `${rows.join('\n')}\n`;
}

function buildAxeFindingsReport(report) {
  const urls = (report.top_urls ?? []).map((entry) => ({
    url: entry.url,
    scan_status: entry.scan_status,
    axe_findings_count: Array.isArray(entry.axe_findings) ? entry.axe_findings.length : 0,
    axe_findings: Array.isArray(entry.axe_findings) ? entry.axe_findings : []
  }));

  const totalFindings = urls.reduce((sum, entry) => sum + entry.axe_findings_count, 0);

  return {
    run_date: report.run_date,
    run_id: report.run_id,
    generated_at: report.generated_at,
    total_urls: urls.length,
    total_findings: totalFindings,
    urls
  };
}

export async function writeCommittedSnapshot({
  repoRoot,
  report,
  historyIndex,
  dashboardContext
}) {
  const docsRoot = path.join(repoRoot, 'docs');
  const reportsRoot = path.join(docsRoot, 'reports');
  const dailyDir = path.join(reportsRoot, 'daily', report.run_date);

  await fs.mkdir(dailyDir, { recursive: true });

  const notFoundPagePath = path.join(docsRoot, '404.html');
  const dailyReportPath = path.join(dailyDir, 'report.json');
  const dailyPagePath = path.join(dailyDir, 'index.html');
  const codeQualityPagePath = path.join(dailyDir, 'code-quality.html');
  const axeFindingsPath = path.join(dailyDir, 'axe-findings.json');
  const axeFindingsCsvPath = path.join(dailyDir, 'axe-findings.csv');
  const lighthouseHistoryCsvPath = path.join(dailyDir, 'lighthouse-history.csv');
  const pressReleasePath = path.join(dailyDir, 'press-release.md');
  const historyPath = path.join(reportsRoot, 'history.json');
  const dashboardPath = path.join(reportsRoot, 'index.html');

  await fs.writeFile(notFoundPagePath, render404Page(), 'utf8');
  await writeJson(dailyReportPath, report);
  await fs.writeFile(dailyPagePath, renderDailyReportPage(report), 'utf8');
  await fs.writeFile(codeQualityPagePath, renderCodeQualityPage(report), 'utf8');
  const axeFindingsReport = buildAxeFindingsReport(report);
  await writeJson(axeFindingsPath, axeFindingsReport);
  await fs.writeFile(axeFindingsCsvPath, buildAxeFindingsCsv(axeFindingsReport), 'utf8');
  await fs.writeFile(lighthouseHistoryCsvPath, buildHistoryCsv(report.history_series ?? []), 'utf8');
  const pressReleaseMarkdown = buildPressRelease(report, axeFindingsReport);
  await fs.writeFile(pressReleasePath, `${pressReleaseMarkdown}\n`, 'utf8');
  await writeJson(historyPath, historyIndex);

  const dashboardHtml = renderDashboardPage({
    latestReport: report,
    historyIndex: dashboardContext?.historyEntries ?? historyIndex.entries,
    archiveUrl: dashboardContext?.archiveUrl ?? null,
    archiveWindowDays: dashboardContext?.archiveWindowDays ?? 14
  });
  await fs.writeFile(dashboardPath, dashboardHtml, 'utf8');

  return {
    docs_root: docsRoot,
    not_found_page_path: notFoundPagePath,
    reports_root: reportsRoot,
    report_json_path: dailyReportPath,
    report_page_path: dailyPagePath,
    code_quality_page_path: codeQualityPagePath,
    axe_findings_path: axeFindingsPath,
    axe_findings_csv_path: axeFindingsCsvPath,
    lighthouse_history_csv_path: lighthouseHistoryCsvPath,
    press_release_path: pressReleasePath,
    history_index_path: historyPath,
    dashboard_page_path: dashboardPath
  };
}
