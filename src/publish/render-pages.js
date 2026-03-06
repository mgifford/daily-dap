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

function renderEstimatedImpactSection(report) {
  const impact = report.estimated_impact;
  if (!impact) {
    return '';
  }
  
  const affectedSharePercent = impact.affected_share_percent ?? 0;
  const trafficWindowMode = impact.traffic_window_mode ?? 'daily';
  
  // Check if we have any real impact data (non-zero estimated users in any category)
  const hasImpactData = (impact.categories || []).some(
    (category) => category.estimated_impacted_users > 0
  );
  
  if (!hasImpactData && affectedSharePercent === 0) {
    return `
  <h2>Estimated Impact (${escapeHtml(trafficWindowMode)})</h2>
  <p><em>No accessibility findings data available for this scan. The impact estimation requires detailed accessibility findings from scanning tools. Currently, the scanner is running in a mode that does not collect individual accessibility issues.</em></p>`;
  }
  
  return `
  <h2>Estimated Impact (${escapeHtml(trafficWindowMode)})</h2>
  <p>Affected share percent: ${affectedSharePercent}</p>
  <table border="1" cellpadding="6" cellspacing="0">
    <thead><tr><th>Category</th><th>Prevalence</th><th>Estimated impacted users</th></tr></thead>
    <tbody>
      ${renderCategoryRows(impact.categories)}
    </tbody>
  </table>`;
}

function hasNonZeroScores(entry) {
  const scores = entry.aggregate_scores;
  return scores.performance !== 0 || 
         scores.accessibility !== 0 || 
         scores.best_practices !== 0 || 
         scores.seo !== 0;
}

function roundScore(value) {
  return Math.round(value * 100) / 100;
}

function calculateMonthlyAverages(historySeries = []) {
  const monthlyData = {};
  
  historySeries
    .filter(hasNonZeroScores)
    .forEach((entry) => {
      const monthKey = entry.date.slice(0, 7);
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          count: 0,
          totals: { performance: 0, accessibility: 0, best_practices: 0, seo: 0 }
        };
      }
      
      const data = monthlyData[monthKey];
      data.count += 1;
      data.totals.performance += entry.aggregate_scores.performance;
      data.totals.accessibility += entry.aggregate_scores.accessibility;
      data.totals.best_practices += entry.aggregate_scores.best_practices;
      data.totals.seo += entry.aggregate_scores.seo;
    });
  
  return Object.entries(monthlyData)
    .map(([month, data]) => ({
      date: month,
      isAverage: true,
      aggregate_scores: {
        performance: roundScore(data.totals.performance / data.count),
        accessibility: roundScore(data.totals.accessibility / data.count),
        best_practices: roundScore(data.totals.best_practices / data.count),
        seo: roundScore(data.totals.seo / data.count)
      }
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function renderHistoryRows(historySeries = []) {
  const filteredSeries = historySeries.filter(hasNonZeroScores);
  const reversedSeries = [...filteredSeries].reverse();
  const monthlyAverages = calculateMonthlyAverages(historySeries);
  
  const dailyRows = reversedSeries.map(
    (entry) =>
      `<tr><td>${escapeHtml(entry.date)}</td><td>${entry.aggregate_scores.performance}</td><td>${entry.aggregate_scores.accessibility}</td><td>${entry.aggregate_scores.best_practices}</td><td>${entry.aggregate_scores.seo}</td></tr>`
  );
  
  const monthlyRows = monthlyAverages.map(
    (entry) =>
      `<tr style="background-color: #f0f0f0; font-weight: bold;"><td>${escapeHtml(entry.date)} (avg)</td><td>${entry.aggregate_scores.performance}</td><td>${entry.aggregate_scores.accessibility}</td><td>${entry.aggregate_scores.best_practices}</td><td>${entry.aggregate_scores.seo}</td></tr>`
  );
  
  return [...monthlyRows, ...dailyRows].join('\n');
}

function renderLighthouseScoreCell(scores, key) {
  if (!scores) {
    return '<td>—</td>';
  }
  const value = scores[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '<td>—</td>';
  }
  return `<td>${value}</td>`;
}

function renderAxeFindingItems(items = []) {
  if (items.length === 0) {
    return '<p><em>No specific element details available.</em></p>';
  }

  return items
    .map(
      (item, index) => `
      <div class="axe-item">
        <p><strong>Element ${index + 1}</strong></p>
        ${item.selector ? `<p><strong>Selector:</strong> <code>${escapeHtml(item.selector)}</code></p>` : ''}
        ${item.snippet ? `<p><strong>HTML:</strong></p><pre><code>${escapeHtml(item.snippet)}</code></pre>` : ''}
        ${item.node_label ? `<p><strong>Label:</strong> ${escapeHtml(item.node_label)}</p>` : ''}
        ${item.explanation ? `<p><strong>How to fix:</strong> ${escapeHtml(item.explanation)}</p>` : ''}
      </div>`
    )
    .join('\n');
}

function renderAxeFindingsList(axeFindings = []) {
  if (axeFindings.length === 0) {
    return '<p>No accessibility findings from this scan.</p>';
  }

  return axeFindings
    .map(
      (finding) => `
      <details>
        <summary><strong>${escapeHtml(finding.title)}</strong> (rule: <code>${escapeHtml(finding.id)}</code>)</summary>
        <div class="finding-detail">
          <p>${escapeHtml(finding.description)}</p>
          <p><strong>Affected elements (${finding.items.length}):</strong></p>
          ${renderAxeFindingItems(finding.items)}
        </div>
      </details>`
    )
    .join('\n');
}

function renderUrlModal(entry, modalId) {
  const axeFindings = Array.isArray(entry.axe_findings) ? entry.axe_findings : [];
  return `
<dialog id="${escapeHtml(modalId)}" aria-labelledby="${escapeHtml(modalId)}-title" aria-modal="true" class="axe-modal">
  <div class="modal-header">
    <h2 id="${escapeHtml(modalId)}-title">Accessibility Findings</h2>
    <button class="modal-close" aria-label="Close dialog" data-close-modal="${escapeHtml(modalId)}">&#x2715;</button>
  </div>
  <p><a href="${escapeHtml(entry.url)}" target="_blank" rel="noreferrer">${escapeHtml(entry.url)}</a></p>
  <p>Lighthouse Accessibility Score: ${entry.lighthouse_scores ? entry.lighthouse_scores.accessibility : '—'}</p>
  <p>Axe findings: ${axeFindings.length}</p>
  ${renderAxeFindingsList(axeFindings)}
  <p><a href="axe-findings.json">Download full axe findings JSON</a></p>
  <div class="modal-footer">
    <button aria-label="Close dialog" data-close-modal="${escapeHtml(modalId)}">Close</button>
  </div>
</dialog>`;
}

function renderTopUrlModals(topUrls = []) {
  return topUrls
    .slice(0, 100)
    .map((entry, index) => renderUrlModal(entry, `modal-url-${index}`))
    .join('\n');
}

function renderTopUrlRows(topUrls = []) {
  return topUrls
    .slice(0, 100)
    .map(
      (entry, index) => `<tr>
  <td><a href="${escapeHtml(entry.url)}" target="_blank" rel="noreferrer">${escapeHtml(entry.url)}</a></td>
  <td>${entry.page_load_count}</td>
  <td>${escapeHtml(entry.scan_status)}</td>
  <td>${escapeHtml(entry.core_web_vitals_status ?? 'unknown')}</td>
  ${renderLighthouseScoreCell(entry.lighthouse_scores, 'performance')}
  ${renderLighthouseScoreCell(entry.lighthouse_scores, 'accessibility')}
  ${renderLighthouseScoreCell(entry.lighthouse_scores, 'best_practices')}
  ${renderLighthouseScoreCell(entry.lighthouse_scores, 'seo')}
  <td>${entry.findings_count}</td>
  <td>${entry.severe_findings_count}</td>
  <td>${entry.failure_reason ? escapeHtml(entry.failure_reason) : ''}</td>
  <td><button class="details-btn" aria-haspopup="dialog" data-open-modal="modal-url-${index}">Details</button></td>
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
  <style>
    .axe-modal {
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 1.5rem;
      max-width: 800px;
      width: 90vw;
      max-height: 80vh;
      overflow-y: auto;
    }
    .axe-modal::backdrop {
      background: rgba(0, 0, 0, 0.5);
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .modal-header h2 {
      margin: 0;
    }
    .modal-close {
      background: none;
      border: 1px solid #ccc;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1.2rem;
      padding: 0.2rem 0.5rem;
    }
    .modal-footer {
      margin-top: 1rem;
      text-align: right;
    }
    .axe-item {
      border-left: 3px solid #d9534f;
      margin: 0.5rem 0;
      padding: 0.5rem 0.75rem;
      background: #fef9f9;
    }
    .axe-item pre {
      background: #f5f5f5;
      padding: 0.5rem;
      overflow-x: auto;
      font-size: 0.85em;
    }
    .finding-detail {
      padding: 0.5rem 1rem;
      border: 1px solid #e0e0e0;
      margin-top: 0.25rem;
    }
    details summary {
      cursor: pointer;
      padding: 0.4rem 0;
    }
    .details-btn {
      background: #0071bc;
      border: none;
      border-radius: 3px;
      color: #fff;
      cursor: pointer;
      font-size: 0.85em;
      padding: 0.25rem 0.6rem;
      white-space: nowrap;
    }
    .details-btn:hover {
      background: #205493;
    }
  </style>
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
  </ul>

  ${renderEstimatedImpactSection(report)}

  <h2>History</h2>
  <table border="1" cellpadding="6" cellspacing="0">
    <thead><tr><th>Date</th><th>Performance</th><th>Accessibility</th><th>Best Practices</th><th>SEO</th></tr></thead>
    <tbody>
      ${renderHistoryRows(report.history_series)}
    </tbody>
  </table>

  <h2>Top URLs by Traffic (Scanned)</h2>
  <p>Showing up to ${Math.min((report.top_urls ?? []).length, 100)} highest-traffic URLs from the latest available DAP day in this run.</p>
  <p><strong>Note:</strong> CWV = Core Web Vitals (measures page loading performance including Largest Contentful Paint, Cumulative Layout Shift, and Interaction to Next Paint). Lighthouse scores are 0–100 (higher is better). Click <strong>Details</strong> to view WCAG accessibility findings for each URL.</p>
  <p><a href="axe-findings.json">Download axe findings JSON for this day</a></p>
  <table border="1" cellpadding="6" cellspacing="0">
    <thead>
      <tr>
        <th>URL</th>
        <th>Traffic</th>
        <th>Scan status</th>
        <th>CWV</th>
        <th>LH Performance</th>
        <th>LH Accessibility</th>
        <th>LH Best Practices</th>
        <th>LH SEO</th>
        <th>Total findings</th>
        <th>Critical/Serious</th>
        <th>Failure reason</th>
        <th>Axe details</th>
      </tr>
    </thead>
    <tbody>
      ${renderTopUrlRows(report.top_urls)}
    </tbody>
  </table>

  ${renderTopUrlModals(report.top_urls)}

  <script>
    document.addEventListener('DOMContentLoaded', function () {
      document.querySelectorAll('[data-open-modal]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var dialog = document.getElementById(btn.dataset.openModal);
          if (dialog) { dialog.showModal(); }
        });
      });
      document.querySelectorAll('[data-close-modal]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var dialog = document.getElementById(btn.dataset.closeModal);
          if (dialog) { dialog.close(); }
        });
      });
    });
  </script>
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
