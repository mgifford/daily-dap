import fs from 'node:fs/promises';
import path from 'node:path';
import { renderDailyReportPage, renderDashboardPage } from './render-pages.js';

async function writeJson(filePath, payload) {
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
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
  const reportsRoot = path.join(repoRoot, 'docs', 'reports');
  const dailyDir = path.join(reportsRoot, 'daily', report.run_date);

  await fs.mkdir(dailyDir, { recursive: true });

  const dailyReportPath = path.join(dailyDir, 'report.json');
  const dailyPagePath = path.join(dailyDir, 'index.html');
  const axeFindingsPath = path.join(dailyDir, 'axe-findings.json');
  const historyPath = path.join(reportsRoot, 'history.json');
  const dashboardPath = path.join(reportsRoot, 'index.html');

  await writeJson(dailyReportPath, report);
  await fs.writeFile(dailyPagePath, renderDailyReportPage(report), 'utf8');
  await writeJson(axeFindingsPath, buildAxeFindingsReport(report));
  await writeJson(historyPath, historyIndex);

  const dashboardHtml = renderDashboardPage({
    latestReport: report,
    historyIndex: dashboardContext?.historyEntries ?? historyIndex.entries
  });
  await fs.writeFile(dashboardPath, dashboardHtml, 'utf8');

  return {
    reports_root: reportsRoot,
    report_json_path: dailyReportPath,
    report_page_path: dailyPagePath,
    axe_findings_path: axeFindingsPath,
    history_index_path: historyPath,
    dashboard_page_path: dashboardPath
  };
}
