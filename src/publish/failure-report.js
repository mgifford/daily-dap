import fs from 'node:fs/promises';
import path from 'node:path';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function buildFailureReport({ runMetadata, error }) {
  return {
    report_type: 'failure',
    status: 'failed',
    run_date: runMetadata.run_date,
    run_id: runMetadata.run_id,
    traffic_window_mode: runMetadata.traffic_window_mode,
    url_limit: runMetadata.url_limit_requested,
    generated_at: new Date().toISOString(),
    error: {
      message: error?.message ?? 'Unknown failure',
      stack: error?.stack ?? null
    }
  };
}

export function renderFailurePage(failureReport) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Daily DAP Failure ${escapeHtml(failureReport.run_date)}</title>
</head>
<body>
  <h1>Daily DAP Run Failure</h1>
  <p>Run date: ${escapeHtml(failureReport.run_date)}</p>
  <p>Run ID: ${escapeHtml(failureReport.run_id)}</p>
  <p>Status: failed</p>
  <h2>Error</h2>
  <pre>${escapeHtml(failureReport.error.message)}</pre>
</body>
</html>`;
}

export async function writeFailureSnapshot({ repoRoot, failureReport }) {
  const dailyDir = path.join(repoRoot, 'docs', 'reports', 'daily', failureReport.run_date);
  await fs.mkdir(dailyDir, { recursive: true });

  const reportPath = path.join(dailyDir, 'report.json');
  const pagePath = path.join(dailyDir, 'index.html');

  await fs.writeFile(reportPath, `${JSON.stringify(failureReport, null, 2)}\n`, 'utf8');
  await fs.writeFile(pagePath, renderFailurePage(failureReport), 'utf8');

  return {
    report_path: reportPath,
    page_path: pagePath
  };
}
