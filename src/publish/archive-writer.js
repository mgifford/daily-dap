import fs from 'node:fs/promises';
import path from 'node:path';
import { renderDailyReportPage, renderDashboardPage } from './render-pages.js';

async function writeJson(filePath, payload) {
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
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
  const historyPath = path.join(reportsRoot, 'history.json');
  const dashboardPath = path.join(reportsRoot, 'index.html');

  await writeJson(dailyReportPath, report);
  await fs.writeFile(dailyPagePath, renderDailyReportPage(report), 'utf8');
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
    history_index_path: historyPath,
    dashboard_page_path: dashboardPath
  };
}
