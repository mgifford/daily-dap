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

function renderDescriptionHtml(description) {
  // Convert [text](url) markdown links to HTML anchors; escape everything else.
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  let result = '';
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(description)) !== null) {
    result += escapeHtml(description.slice(lastIndex, match.index));
    result += `<a href="${escapeHtml(match[2])}" target="_blank" rel="noreferrer">${escapeHtml(match[1])}</a>`;
    lastIndex = match.index + match[0].length;
  }
  result += escapeHtml(description.slice(lastIndex));
  return result;
}

function renderExplanationHtml(explanation) {
  if (!explanation) {
    return '';
  }

  const lines = explanation.split('\n');
  const firstLine = escapeHtml(lines[0].trim());
  const bulletLines = lines.slice(1).map((l) => l.trim()).filter(Boolean);

  if (bulletLines.length === 0) {
    return `<p><strong>How to fix:</strong> ${firstLine}</p>`;
  }

  const listItems = bulletLines.map((l) => `<li>${escapeHtml(l)}</li>`).join('\n        ');
  return `<p><strong>How to fix:</strong> ${firstLine}</p>
      <ul class="fix-list">
        ${listItems}
      </ul>`;
}

function formatWcagTag(tag) {
  // Match purely numeric criterion tags like wcag412 (WCAG 4.1.2) or wcag2411 (WCAG 2.4.11).
  // Level tags like wcag2a or wcag2aa are intentionally excluded (they contain letters).
  // The regex guarantees 3–4 digits, so digits[0], digits[1], and digits.slice(2) are always valid.
  const match = tag.match(/^wcag(\d{3,4})$/);
  if (!match) {
    return null;
  }
  // principle = first digit, guideline = second digit, criterion = remaining 1–2 digits
  const digits = match[1];
  return `WCAG ${digits[0]}.${digits[1]}.${digits.slice(2)}`;
}

function renderWcagTags(tags = []) {
  const wcagLabels = tags.map(formatWcagTag).filter(Boolean);
  if (wcagLabels.length === 0) {
    return '';
  }
  return `<p class="wcag-tags"><strong>WCAG criteria:</strong> ${wcagLabels.map((l) => escapeHtml(l)).join(', ')}</p>`;
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
        ${item.selector ? `<p><strong>Element path:</strong> <code>${escapeHtml(item.selector)}</code></p>` : ''}
        ${item.snippet ? `<p><strong>Snippet:</strong></p><pre><code>${escapeHtml(item.snippet)}</code></pre>` : ''}
        ${item.node_label && item.node_label !== item.selector ? `<p><strong>Label:</strong> ${escapeHtml(item.node_label)}</p>` : ''}
        ${renderExplanationHtml(item.explanation)}
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
          <p>${renderDescriptionHtml(finding.description)}</p>
          ${renderWcagTags(finding.tags)}
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

function renderDapContextSection() {
  return `
  <section aria-labelledby="dap-context-heading">
    <h2 id="dap-context-heading">About These Reports</h2>
    <p>The <strong>Digital Analytics Program (DAP)</strong> is a U.S. government analytics service that collects website traffic data across participating federal agencies. DAP tracks page views, visitor counts, and usage patterns for hundreds of government websites, providing transparency into how the public engages with federal digital services.</p>
    <p>This report measures the <strong>quality and accessibility</strong> of the top 100 most-visited U.S. government URLs as reported by DAP. Each day, Lighthouse scans are run against these URLs to measure:</p>
    <ul>
      <li><strong>Performance</strong> - How fast pages load for users (scores 0-100, higher is better)</li>
      <li><strong>Accessibility</strong> - How well pages work for users with disabilities, following WCAG guidelines (scores 0-100, higher is better)</li>
      <li><strong>Best Practices</strong> - Whether pages follow modern web development standards (scores 0-100, higher is better)</li>
      <li><strong>SEO</strong> - How well pages are optimized for search engines (scores 0-100, higher is better)</li>
    </ul>
    <p>Accessibility findings come from <a href="https://www.deque.com/axe/" target="_blank" rel="noreferrer">axe-core</a>, the industry-standard accessibility testing engine embedded in Lighthouse. The <strong>axe findings</strong> surface specific WCAG violations such as missing alternative text, insufficient color contrast, and missing form labels that make government websites harder to use for people with disabilities.</p>
    <p>Traffic data reflects daily visitor counts from DAP. URLs are ranked by page load count, ensuring the most-used government pages are prioritized for quality measurement.</p>
  </section>`;
}

function renderDayComparisonSection(report) {
  const currentDate = report.run_date;
  const historySeries = report.history_series ?? [];

  const prevEntry = [...historySeries]
    .reverse()
    .find((entry) => {
      if (entry.date >= currentDate) return false;
      const s = entry.aggregate_scores;
      return s && (s.performance !== 0 || s.accessibility !== 0 || s.best_practices !== 0 || s.seo !== 0);
    });

  if (!prevEntry) {
    return '';
  }

  const curr = report.aggregate_scores;
  const prev = prevEntry.aggregate_scores;

  function scoreDelta(current, previous) {
    const delta = Math.round((current - previous) * 100) / 100;
    if (delta > 0) return `<span style="color:#2e7d32" aria-label="increased by ${delta}">+${delta}</span>`;
    if (delta < 0) return `<span style="color:#c62828" aria-label="decreased by ${Math.abs(delta)}">${delta}</span>`;
    return `<span style="color:#555" aria-label="no change">0</span>`;
  }

  return `
  <section aria-labelledby="day-comparison-heading">
    <h2 id="day-comparison-heading">Day-over-Day Comparison (vs ${escapeHtml(prevEntry.date)})</h2>
    <table border="1" cellpadding="6" cellspacing="0">
      <thead>
        <tr>
          <th scope="col">Metric</th>
          <th scope="col">${escapeHtml(prevEntry.date)}</th>
          <th scope="col">${escapeHtml(currentDate)}</th>
          <th scope="col">Change</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Performance</td><td>${prev.performance}</td><td>${curr.performance}</td><td>${scoreDelta(curr.performance, prev.performance)}</td></tr>
        <tr><td>Accessibility</td><td>${prev.accessibility}</td><td>${curr.accessibility}</td><td>${scoreDelta(curr.accessibility, prev.accessibility)}</td></tr>
        <tr><td>Best Practices</td><td>${prev.best_practices}</td><td>${curr.best_practices}</td><td>${scoreDelta(curr.best_practices, prev.best_practices)}</td></tr>
        <tr><td>SEO</td><td>${prev.seo}</td><td>${curr.seo}</td><td>${scoreDelta(curr.seo, prev.seo)}</td></tr>
      </tbody>
    </table>
  </section>`;
}

function buildAxePatternCounts(topUrls = []) {
  const counts = new Map();
  for (const entry of topUrls) {
    for (const finding of entry.axe_findings ?? []) {
      const existing = counts.get(finding.id);
      if (existing) {
        existing.count += 1;
        existing.title = finding.title;
      } else {
        counts.set(finding.id, { id: finding.id, title: finding.title, count: 1 });
      }
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count);
}

function renderAxePatternsSection(topUrls = []) {
  const patterns = buildAxePatternCounts(topUrls);

  if (patterns.length === 0) {
    return '';
  }

  const topPatterns = patterns.slice(0, 10);

  const rows = topPatterns
    .map(
      (p) =>
        `<tr><td><code>${escapeHtml(p.id)}</code></td><td>${escapeHtml(p.title)}</td><td>${p.count}</td></tr>`
    )
    .join('\n');

  return `
  <section aria-labelledby="axe-patterns-heading">
    <h2 id="axe-patterns-heading">Common Accessibility Issues (Top ${topPatterns.length})</h2>
    <p>The following axe-core rules were most frequently violated across scanned URLs today. These patterns indicate systemic accessibility barriers present across multiple government websites.</p>
    <table border="1" cellpadding="6" cellspacing="0">
      <thead>
        <tr>
          <th scope="col">Rule ID</th>
          <th scope="col">Description</th>
          <th scope="col">URLs affected</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    <p><a href="axe-findings.json">Download full axe findings JSON for this day</a></p>
  </section>`;
}

function renderNarrativeSection(report) {
  const historySeries = report.history_series ?? [];
  const nonZero = historySeries.filter(hasNonZeroScores);

  if (nonZero.length < 2) {
    return '';
  }

  const oldest = nonZero[0];
  const newest = nonZero[nonZero.length - 1];
  const dayCount = nonZero.length;

  const accessDelta = Math.round((newest.aggregate_scores.accessibility - oldest.aggregate_scores.accessibility) * 100) / 100;
  const perfDelta = Math.round((newest.aggregate_scores.performance - oldest.aggregate_scores.performance) * 100) / 100;

  function trend(delta) {
    if (delta > 0.5) return 'improved';
    if (delta < -0.5) return 'declined';
    return 'remained stable';
  }

  const accessTrend = trend(accessDelta);
  const perfTrend = trend(perfDelta);

  const accessDeltaText = accessDelta >= 0 ? `+${accessDelta}` : `${accessDelta}`;
  const perfDeltaText = perfDelta >= 0 ? `+${perfDelta}` : `${perfDelta}`;

  return `
  <section aria-labelledby="narrative-heading">
    <h2 id="narrative-heading">Accessibility Trend Narrative</h2>
    <p>Over the past <strong>${dayCount} days</strong> of data (${escapeHtml(oldest.date)} to ${escapeHtml(newest.date)}), government website accessibility scores have <strong>${accessTrend}</strong> (${accessDeltaText} points, from ${oldest.aggregate_scores.accessibility} to ${newest.aggregate_scores.accessibility}). Performance scores have ${perfTrend} (${perfDeltaText} points, from ${oldest.aggregate_scores.performance} to ${newest.aggregate_scores.performance}).</p>
    <p>Today's aggregate accessibility score of <strong>${report.aggregate_scores.accessibility}</strong> reflects the mean Lighthouse accessibility score across ${report.url_counts.succeeded} successfully scanned government URLs. A score above 90 indicates generally strong compliance with WCAG automated checks, though manual testing is always recommended to fully assess accessibility.</p>
  </section>`;
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
  <title>Daily DAP Accessibility Report - ${escapeHtml(report.run_date)}</title>
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
    .fix-list {
      margin: 0.25rem 0 0.5rem 1.5rem;
      padding: 0;
    }
    .fix-list li {
      margin: 0.2rem 0;
    }
    .wcag-tags {
      margin: 0.25rem 0;
      font-size: 0.9em;
      color: #444;
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
  <h1>Daily DAP Accessibility Report - ${escapeHtml(report.run_date)}</h1>
  <p>Run ID: ${escapeHtml(report.run_id)}</p>
  <p>Status: ${escapeHtml(report.report_status)}</p>
  <p>Source data date: ${escapeHtml(report.source_data_date ?? report.run_date)}</p>
  <p>Report generated at: ${formatTimestamp(report.generated_at)}</p>
  <p><a href="../../index.html">Back to dashboard</a></p>

  ${renderDapContextSection()}

  ${renderNarrativeSection(report)}

  ${renderDayComparisonSection(report)}

  ${renderAxePatternsSection(report.top_urls)}

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
    .map((entry) => `<li><a href="./daily/${entry.run_date}/index.html">${escapeHtml(entry.run_date)}</a> (${escapeHtml(entry.run_id)})</li>`)
    .join('\n');

  const latestScores = latestReport?.aggregate_scores;

  const scoresSummary = latestScores
    ? `
  <section aria-labelledby="latest-scores-heading">
    <h2 id="latest-scores-heading">Latest Scores (${escapeHtml(latestReport.run_date)})</h2>
    <ul>
      <li>Performance: ${latestScores.performance}</li>
      <li>Accessibility: ${latestScores.accessibility}</li>
      <li>Best Practices: ${latestScores.best_practices}</li>
      <li>SEO: ${latestScores.seo}</li>
    </ul>
  </section>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Daily DAP Accessibility Reports</title>
</head>
<body>
  <h1>Daily DAP Accessibility Reports</h1>

  <section aria-labelledby="about-heading">
    <h2 id="about-heading">What is This?</h2>
    <p>The <strong>Digital Analytics Program (DAP)</strong> tracks website traffic across U.S. federal government websites. This dashboard shows daily automated accessibility and quality scans of the top 100 most-visited government URLs, measured using Google Lighthouse and the axe-core accessibility engine.</p>
    <p>Each report covers:</p>
    <ul>
      <li><strong>Accessibility scores</strong> - WCAG compliance measured by Lighthouse (0-100, higher is better)</li>
      <li><strong>Axe findings</strong> - Specific WCAG violations detected by axe-core rules</li>
      <li><strong>Performance, Best Practices, and SEO scores</strong> - Overall web quality metrics</li>
      <li><strong>Day-over-day changes</strong> - How scores shift compared to the previous day</li>
    </ul>
    <p>Scans run daily. Click any report date to see detailed per-URL findings, accessibility patterns, and trend analysis.</p>
  </section>

  ${scoresSummary}

  <section aria-labelledby="latest-report-heading">
    <h2 id="latest-report-heading">Latest Report</h2>
    <p>Run date: ${escapeHtml(latestReport?.run_date ?? 'n/a')}</p>
    <p><a href="./daily/${escapeHtml(latestReport?.run_date ?? '')}/index.html">Open latest report</a></p>
  </section>

  <section aria-labelledby="recent-reports-heading">
    <h2 id="recent-reports-heading">Recent Reports</h2>
    <ul>
      ${historyLinks}
    </ul>
  </section>
</body>
</html>`;
}
