function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderCategoryRows(categories = []) {
  return categories
    .map(
      (category) =>
        `<tr><td>${escapeHtml(category.name)}</td><td>${category.prevalence_rate}</td><td>${category.estimated_impacted_users}</td></tr>`
    )
    .join('\n');
}

function renderHistoryRows(historySeries = []) {
  return historySeries
    .map(
      (entry) =>
        `<tr><td>${escapeHtml(entry.date)}</td><td>${entry.aggregate_scores.performance}</td><td>${entry.aggregate_scores.accessibility}</td><td>${entry.aggregate_scores.best_practices}</td><td>${entry.aggregate_scores.seo}</td><td>${entry.aggregate_scores.pwa}</td></tr>`
    )
    .join('\n');
}

function renderTopUrlRows(topUrls = []) {
  return topUrls
    .slice(0, 100)
    .map(
      (entry) => `<tr>
  <td><a href="${escapeHtml(entry.url)}" target="_blank" rel="noreferrer">${escapeHtml(entry.url)}</a></td>
  <td>${entry.page_load_count}</td>
  <td>${escapeHtml(entry.scan_status)}</td>
  <td>${escapeHtml(entry.core_web_vitals_status ?? 'unknown')}</td>
  <td>${entry.findings_count}</td>
  <td>${entry.severe_findings_count}</td>
  <td>${entry.failure_reason ? escapeHtml(entry.failure_reason) : ''}</td>
</tr>`
    )
    .join('\n');
}

function renderExecutionErrorNotice(report) {
  const diagnostics = report?.scan_diagnostics;
  if (!diagnostics) {
    return '';
  }

  const failedCount = diagnostics.failed_count ?? 0;
  const executionErrorCount = diagnostics.failure_reasons?.execution_error ?? 0;
  const successCount = diagnostics.success_count ?? 0;

  if (failedCount < 1 || successCount > 0 || executionErrorCount !== failedCount) {
    return '';
  }

  return `<p><strong>Scanner notice:</strong> All scans failed with execution errors, so Lighthouse scores are unavailable for this run. This usually indicates the runtime browser dependency for Lighthouse was unavailable during execution.</p>`;
}

function formatTimestamp(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return 'unknown';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return escapeHtml(value);
  }

  return escapeHtml(date.toISOString());
}

export function renderDailyReportPage(report) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Daily DAP Report ${escapeHtml(report.run_date)}</title>
</head>
<body>
  <h1>Daily DAP Report — ${escapeHtml(report.run_date)}</h1>
  <p>Run ID: ${escapeHtml(report.run_id)}</p>
  <p>Status: ${escapeHtml(report.report_status)}</p>
  <p>Source data date: ${escapeHtml(report.source_data_date ?? report.run_date)}</p>
  <p>Report generated at: ${formatTimestamp(report.generated_at)}</p>

  <h2>URL Counts</h2>
  <ul>
    <li>Processed: ${report.url_counts.processed}</li>
    <li>Succeeded: ${report.url_counts.succeeded}</li>
    <li>Failed: ${report.url_counts.failed}</li>
    <li>Excluded: ${report.url_counts.excluded}</li>
  </ul>

  <h2>Aggregate Scores</h2>
  ${renderExecutionErrorNotice(report)}
  <ul>
    <li>Performance: ${report.aggregate_scores.performance}</li>
    <li>Accessibility: ${report.aggregate_scores.accessibility}</li>
    <li>Best Practices: ${report.aggregate_scores.best_practices}</li>
    <li>SEO: ${report.aggregate_scores.seo}</li>
    <li>PWA: ${report.aggregate_scores.pwa}</li>
  </ul>

  <h2>Estimated Impact (${escapeHtml(report.estimated_impact.traffic_window_mode)})</h2>
  <p>Affected share percent: ${report.estimated_impact.affected_share_percent}</p>
  <table border="1" cellpadding="6" cellspacing="0">
    <thead><tr><th>Category</th><th>Prevalence</th><th>Estimated impacted users</th></tr></thead>
    <tbody>
      ${renderCategoryRows(report.estimated_impact.categories)}
    </tbody>
  </table>

  <h2>History</h2>
  <table border="1" cellpadding="6" cellspacing="0">
    <thead><tr><th>Date</th><th>Performance</th><th>Accessibility</th><th>Best Practices</th><th>SEO</th><th>PWA</th></tr></thead>
    <tbody>
      ${renderHistoryRows(report.history_series)}
    </tbody>
  </table>

  <h2>Top URLs by Traffic (Scanned)</h2>
  <p>Showing up to ${Math.min((report.top_urls ?? []).length, 100)} highest-traffic URLs from the latest available DAP day in this run.</p>
  <table border="1" cellpadding="6" cellspacing="0">
    <thead>
      <tr>
        <th>URL</th>
        <th>Traffic</th>
        <th>Scan status</th>
        <th>CWV</th>
        <th>Total findings</th>
        <th>Critical/Serious</th>
        <th>Failure reason</th>
      </tr>
    </thead>
    <tbody>
      ${renderTopUrlRows(report.top_urls)}
    </tbody>
  </table>
</body>
</html>`;
}

export function renderDashboardPage({ latestReport, historyIndex = [] }) {
  const historyLinks = historyIndex
    .map((entry) => `<li><a href="./daily/${entry.run_date}/index.html">${escapeHtml(entry.run_date)}</a> (${entry.run_id})</li>`)
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Daily DAP Reports</title>
</head>
<body>
  <h1>Daily DAP Quality Reports</h1>
  <p>Latest run: ${escapeHtml(latestReport?.run_date ?? 'n/a')}</p>
  <p><a href="./daily/${escapeHtml(latestReport?.run_date ?? '')}/index.html">Open latest report</a></p>

  <h2>Recent Reports</h2>
  <ul>
    ${historyLinks}
  </ul>
</body>
</html>`;
}
