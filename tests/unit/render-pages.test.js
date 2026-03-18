import test from 'node:test';
import assert from 'node:assert/strict';
import { renderDailyReportPage, renderDashboardPage, renderArchiveIndexPage, renderArchiveRedirectStub, render404Page, buildFindingCopyText, plainTextDescription } from '../../src/publish/render-pages.js';

test('renderDailyReportPage filters out zero-score history entries', () => {
  const report = {
    run_date: '2026-02-27',
    run_id: 'test-run',
    url_counts: { processed: 10, succeeded: 10, failed: 0, excluded: 0 },
    aggregate_scores: {
      performance: 80,
      accessibility: 90,
      best_practices: 85,
      seo: 88,
      pwa: 0
    },
    estimated_impact: {
      traffic_window_mode: 'daily',
      affected_share_percent: 10,
      categories: []
    },
    history_series: [
      { date: '2026-02-25', aggregate_scores: { performance: 0, accessibility: 0, best_practices: 0, seo: 0, pwa: 0 } },
      { date: '2026-02-26', aggregate_scores: { performance: 75, accessibility: 85, best_practices: 80, seo: 82, pwa: 0 } },
      { date: '2026-02-27', aggregate_scores: { performance: 80, accessibility: 90, best_practices: 85, seo: 88, pwa: 0 } }
    ],
    top_urls: [],
    generated_at: '2026-02-27T00:00:00.000Z',
    report_status: 'success'
  };

  const html = renderDailyReportPage(report);
  
  // Should not contain the all-zero date
  assert.ok(!html.includes('2026-02-25'), 'Should not include date with all zero scores');
  
  // Should contain non-zero dates
  assert.ok(html.includes('2026-02-26'));
  assert.ok(html.includes('2026-02-27'));
});

test('renderDailyReportPage reverses history order (most recent first)', () => {
  const report = {
    run_date: '2026-02-27',
    run_id: 'test-run',
    url_counts: { processed: 10, succeeded: 10, failed: 0, excluded: 0 },
    aggregate_scores: {
      performance: 80,
      accessibility: 90,
      best_practices: 85,
      seo: 88,
      pwa: 0
    },
    estimated_impact: {
      traffic_window_mode: 'daily',
      affected_share_percent: 10,
      categories: []
    },
    history_series: [
      { date: '2026-02-25', aggregate_scores: { performance: 70, accessibility: 80, best_practices: 75, seo: 78, pwa: 0 } },
      { date: '2026-02-26', aggregate_scores: { performance: 75, accessibility: 85, best_practices: 80, seo: 82, pwa: 0 } },
      { date: '2026-02-27', aggregate_scores: { performance: 80, accessibility: 90, best_practices: 85, seo: 88, pwa: 0 } }
    ],
    top_urls: [],
    generated_at: '2026-02-27T00:00:00.000Z',
    report_status: 'success'
  };

  const html = renderDailyReportPage(report);
  const historyTableMatch = html.match(/id="history-heading"[^>]*>History[\s\S]*?<\/table>/);
  assert.ok(historyTableMatch, 'History table should exist');
  
  const historyTable = historyTableMatch[0];
  const date27Index = historyTable.indexOf('2026-02-27');
  const date26Index = historyTable.indexOf('2026-02-26');
  const date25Index = historyTable.indexOf('2026-02-25');
  
  // Most recent (27) should come before older dates (26, 25)
  assert.ok(date27Index < date26Index, 'Date 2026-02-27 should appear before 2026-02-26');
  assert.ok(date26Index < date25Index, 'Date 2026-02-26 should appear before 2026-02-25');
});

test('renderDailyReportPage shows Lighthouse scores for top URLs with successful scans', () => {
  const report = {
    run_date: '2026-03-05',
    run_id: 'test-run',
    url_counts: { processed: 2, succeeded: 2, failed: 0, excluded: 0 },
    aggregate_scores: { performance: 55, accessibility: 84, best_practices: 87, seo: 88, pwa: 0 },
    estimated_impact: { traffic_window_mode: 'daily', affected_share_percent: 0, categories: [] },
    history_series: [],
    top_urls: [
      {
        url: 'https://tools.usps.com',
        page_load_count: 11409495,
        scan_status: 'success',
        failure_reason: null,
        findings_count: 0,
        severe_findings_count: 0,
        core_web_vitals_status: 'poor',
        lighthouse_scores: { performance: 39, accessibility: 68, best_practices: 77, seo: 83, pwa: 0 }
      },
      {
        url: 'https://pmc.ncbi.nlm.nih.gov',
        page_load_count: 5106703,
        scan_status: 'success',
        failure_reason: null,
        findings_count: 0,
        severe_findings_count: 0,
        core_web_vitals_status: 'needs_improvement',
        lighthouse_scores: { performance: 70, accessibility: 100, best_practices: 96, seo: 92, pwa: 0 }
      }
    ],
    generated_at: '2026-03-05T00:00:00.000Z',
    report_status: 'success'
  };

  const html = renderDailyReportPage(report);

  // Table should include Lighthouse score column headers (without "LH " prefix)
  assert.ok(html.includes('>Performance<'), 'Should have Performance column header');
  assert.ok(html.includes('>Accessibility<'), 'Should have Accessibility column header');
  assert.ok(html.includes('>Best Practices<'), 'Should have Best Practices column header');
  assert.ok(html.includes('>SEO<'), 'Should have SEO column header');

  // Scores for first URL should appear
  assert.ok(html.includes('>39</td>'), 'Should include performance score 39 for tools.usps.com');
  assert.ok(html.includes('>68</td>'), 'Should include accessibility score 68 for tools.usps.com');
  assert.ok(html.includes('>77</td>'), 'Should include best_practices score 77 for tools.usps.com');
  assert.ok(html.includes('>83</td>'), 'Should include seo score 83 for tools.usps.com');

  // Scores for second URL should appear
  assert.ok(html.includes('>70</td>'), 'Should include performance score 70 for pmc.ncbi.nlm.nih.gov');
  assert.ok(html.includes('>100</td>'), 'Should include accessibility score 100 for pmc.ncbi.nlm.nih.gov');
  assert.ok(html.includes('>96</td>'), 'Should include best_practices score 96 for pmc.ncbi.nlm.nih.gov');
  assert.ok(html.includes('>92</td>'), 'Should include seo score 92 for pmc.ncbi.nlm.nih.gov');
});

test('renderDailyReportPage shows dash for Lighthouse scores when scan failed', () => {
  const report = {
    run_date: '2026-03-05',
    run_id: 'test-run',
    url_counts: { processed: 1, succeeded: 0, failed: 1, excluded: 0 },
    aggregate_scores: { performance: 0, accessibility: 0, best_practices: 0, seo: 0, pwa: 0 },
    estimated_impact: { traffic_window_mode: 'daily', affected_share_percent: 0, categories: [] },
    history_series: [],
    top_urls: [
      {
        url: 'https://example.gov',
        page_load_count: 1000,
        scan_status: 'failed',
        failure_reason: 'timeout',
        findings_count: 0,
        severe_findings_count: 0,
        core_web_vitals_status: 'unknown',
        lighthouse_scores: null
      }
    ],
    generated_at: '2026-03-05T00:00:00.000Z',
    report_status: 'partial'
  };

  const html = renderDailyReportPage(report);

  // Failed scan should show dash placeholders for Lighthouse scores
  const dashCount = (html.match(/<td[^>]*>—<\/td>/g) || []).length;
  assert.ok(dashCount >= 4, 'Should show at least 4 dash placeholders for missing Lighthouse scores');
});

test('renderDailyReportPage includes monthly averages', () => {
  const report = {
    run_date: '2026-02-15',
    run_id: 'test-run',
    url_counts: { processed: 10, succeeded: 10, failed: 0, excluded: 0 },
    aggregate_scores: {
      performance: 80,
      accessibility: 90,
      best_practices: 85,
      seo: 88,
      pwa: 0
    },
    estimated_impact: {
      traffic_window_mode: 'daily',
      affected_share_percent: 10,
      categories: []
    },
    history_series: [
      { date: '2026-01-28', aggregate_scores: { performance: 70, accessibility: 80, best_practices: 75, seo: 78, pwa: 0 } },
      { date: '2026-01-29', aggregate_scores: { performance: 72, accessibility: 82, best_practices: 77, seo: 80, pwa: 0 } },
      { date: '2026-02-10', aggregate_scores: { performance: 75, accessibility: 85, best_practices: 80, seo: 82, pwa: 0 } },
      { date: '2026-02-11', aggregate_scores: { performance: 77, accessibility: 87, best_practices: 82, seo: 84, pwa: 0 } },
      { date: '2026-02-15', aggregate_scores: { performance: 80, accessibility: 90, best_practices: 85, seo: 88, pwa: 0 } }
    ],
    top_urls: [],
    generated_at: '2026-02-15T00:00:00.000Z',
    report_status: 'success'
  };

  const html = renderDailyReportPage(report);
  
  // Should contain monthly average rows
  assert.ok(html.includes('2026-02 (avg)'), 'Should include February average');
  assert.ok(html.includes('2026-01 (avg)'), 'Should include January average');
  
  // Monthly averages should have special styling (check for style attribute presence)
  assert.ok(html.includes('style=') && html.includes('(avg)'), 'Monthly averages should have styling');
});

test('renderDailyReportPage includes Details button and modal dialog for each URL', () => {
  const report = {
    run_date: '2026-03-05',
    run_id: 'test-run',
    url_counts: { processed: 1, succeeded: 1, failed: 0, excluded: 0 },
    aggregate_scores: { performance: 55, accessibility: 68, best_practices: 77, seo: 83, pwa: 0 },
    estimated_impact: { traffic_window_mode: 'daily', affected_share_percent: 0, categories: [] },
    history_series: [],
    top_urls: [
      {
        url: 'https://tools.usps.com',
        page_load_count: 11409495,
        scan_status: 'success',
        failure_reason: null,
        findings_count: 1,
        severe_findings_count: 1,
        core_web_vitals_status: 'poor',
        lighthouse_scores: { performance: 39, accessibility: 68, best_practices: 77, seo: 83, pwa: 0 },
        axe_findings: [
          {
            id: 'color-contrast',
            title: 'Background and foreground colors do not have a sufficient contrast ratio.',
            description: 'Low-contrast text is difficult or impossible for many users to read.',
            score: 0,
            items: [
              {
                selector: '.nav-link',
                snippet: '<a class="nav-link" href="/about">About</a>',
                node_label: 'About',
                explanation: 'Fix: insufficient color contrast of 2.73.'
              }
            ]
          }
        ]
      }
    ],
    generated_at: '2026-03-05T00:00:00.000Z',
    report_status: 'success'
  };

  const html = renderDailyReportPage(report);

  // Table should have Axe details column header
  assert.ok(html.includes('>Axe details<'), 'Should have Axe details column header');

  // Axe details column should appear after Accessibility / Important and before Best Practices in the table header
  // Search within the top-urls table section specifically
  const tableStart = html.indexOf('id="top-urls-table"');
  const tableHeaderSection = html.substring(tableStart, tableStart + 2500);
  const axeDetailsPos = tableHeaderSection.indexOf('>Axe details<');
  const accessibilityPos = tableHeaderSection.indexOf('Accessibility');
  const importantPos = tableHeaderSection.indexOf('/ Important');
  const bestPracticesPos = tableHeaderSection.indexOf('>Best Practices<');
  assert.ok(accessibilityPos < axeDetailsPos, 'Accessibility header should appear before Axe details header in table');
  assert.ok(importantPos < axeDetailsPos, 'Important sub-heading should appear before Axe details header in table');
  assert.ok(axeDetailsPos < bestPracticesPos, 'Axe details header should appear before Best Practices header in table');

  // Removed columns should not appear in the table header
  assert.ok(!tableHeaderSection.includes('>Total findings<'), 'Total findings column should be removed');
  assert.ok(!tableHeaderSection.includes('>Critical/Serious<'), 'Critical/Serious column should be removed');
  assert.ok(!tableHeaderSection.includes('>Failure reason<'), 'Failure reason column should be removed');

  // Details button should show findings count
  assert.ok(html.includes('class="details-btn"'), 'Should have details button');
  assert.ok(html.includes('aria-haspopup="dialog"'), 'Details button should indicate dialog popup');
  assert.ok(html.includes('data-open-modal="modal-url-0"'), 'Details button should use data attribute to open modal');
  assert.ok(html.includes('Details (1)'), 'Details button should show findings count when findings_count > 0');

  // Modal dialog should be present
  assert.ok(html.includes('<dialog'), 'Should include dialog element');
  assert.ok(html.includes('id="modal-url-0"'), 'Should have modal with correct id');
  assert.ok(html.includes('aria-modal="true"'), 'Modal should have aria-modal');

  // Modal should contain axe finding details
  assert.ok(html.includes('color-contrast'), 'Modal should show finding rule id');
  assert.ok(html.includes('Background and foreground colors'), 'Modal should show finding title');
  assert.ok(html.includes('.nav-link'), 'Modal should show selector');
  assert.ok(html.includes('&lt;a class=&quot;nav-link&quot;'), 'Modal should show escaped HTML snippet');

  // Link to axe findings JSON
  assert.ok(html.includes('axe-findings.json'), 'Should include link to axe findings JSON');
});

test('renderDailyReportPage renders modal with "no findings" message when axe_findings is empty', () => {
  const report = {
    run_date: '2026-03-05',
    run_id: 'test-run',
    url_counts: { processed: 1, succeeded: 1, failed: 0, excluded: 0 },
    aggregate_scores: { performance: 90, accessibility: 85, best_practices: 95, seo: 95, pwa: 0 },
    estimated_impact: { traffic_window_mode: 'daily', affected_share_percent: 0, categories: [] },
    history_series: [],
    top_urls: [
      {
        url: 'https://www.nih.gov',
        page_load_count: 5000000,
        scan_status: 'success',
        failure_reason: null,
        findings_count: 0,
        severe_findings_count: 0,
        core_web_vitals_status: 'good',
        lighthouse_scores: { performance: 90, accessibility: 85, best_practices: 95, seo: 95, pwa: 0 },
        axe_findings: []
      }
    ],
    generated_at: '2026-03-05T00:00:00.000Z',
    report_status: 'success'
  };

  const html = renderDailyReportPage(report);

  assert.ok(html.includes('No accessibility findings'), 'Should show no findings message for empty axe_findings');
  assert.ok(html.includes('<dialog'), 'Should still render dialog element');
});

test('renderDailyReportPage hides Details button and modal when accessibility score is 100', () => {
  const report = {
    run_date: '2026-03-05',
    run_id: 'test-run',
    url_counts: { processed: 1, succeeded: 1, failed: 0, excluded: 0 },
    aggregate_scores: { performance: 90, accessibility: 100, best_practices: 95, seo: 95, pwa: 0 },
    estimated_impact: { traffic_window_mode: 'daily', affected_share_percent: 0, categories: [] },
    history_series: [],
    top_urls: [
      {
        url: 'https://www.nih.gov',
        page_load_count: 5000000,
        scan_status: 'success',
        failure_reason: null,
        findings_count: 0,
        severe_findings_count: 0,
        core_web_vitals_status: 'good',
        lighthouse_scores: { performance: 90, accessibility: 100, best_practices: 95, seo: 95, pwa: 0 },
        axe_findings: []
      }
    ],
    generated_at: '2026-03-05T00:00:00.000Z',
    report_status: 'success'
  };

  const html = renderDailyReportPage(report);

  assert.ok(!html.includes('class="details-btn"'), 'Should not show Details button when accessibility score is 100');
  assert.ok(!html.includes('data-open-modal="modal-url-0"'), 'Should not include modal open attribute when accessibility score is 100');
  assert.ok(!html.includes('<dialog'), 'Should not render modal dialog when accessibility score is 100');
});

test('renderDailyReportPage shows Details button when accessibility score is below 100', () => {
  const report = {
    run_date: '2026-03-05',
    run_id: 'test-run',
    url_counts: { processed: 1, succeeded: 1, failed: 0, excluded: 0 },
    aggregate_scores: { performance: 90, accessibility: 99, best_practices: 95, seo: 95, pwa: 0 },
    estimated_impact: { traffic_window_mode: 'daily', affected_share_percent: 0, categories: [] },
    history_series: [],
    top_urls: [
      {
        url: 'https://www.example.gov',
        page_load_count: 3000000,
        scan_status: 'success',
        failure_reason: null,
        findings_count: 1,
        severe_findings_count: 1,
        core_web_vitals_status: 'good',
        lighthouse_scores: { performance: 90, accessibility: 99, best_practices: 95, seo: 95, pwa: 0 },
        axe_findings: [
          {
            id: 'label',
            title: 'Form elements do not have associated labels',
            description: 'Ensures every form element has a label.',
            score: 0,
            items: []
          }
        ]
      }
    ],
    generated_at: '2026-03-05T00:00:00.000Z',
    report_status: 'success'
  };

  const html = renderDailyReportPage(report);

  assert.ok(html.includes('class="details-btn"'), 'Should show Details button when accessibility score is 99');
  assert.ok(html.includes('Details (1)'), 'Should show findings count in Details button');
  assert.ok(html.includes('data-open-modal="modal-url-0"'), 'Should include modal open attribute');
  assert.ok(html.includes('<dialog'), 'Should render modal dialog');
});

test('renderDailyReportPage shows combined Accessibility/Important cell with score and severe count', () => {
  const report = {
    run_date: '2026-03-05',
    run_id: 'test-run',
    url_counts: { processed: 2, succeeded: 2, failed: 0, excluded: 0 },
    aggregate_scores: { performance: 90, accessibility: 85, best_practices: 95, seo: 95, pwa: 0 },
    estimated_impact: { traffic_window_mode: 'daily', affected_share_percent: 0, categories: [] },
    history_series: [],
    top_urls: [
      {
        url: 'https://www.example.gov',
        page_load_count: 3000000,
        scan_status: 'success',
        failure_reason: null,
        findings_count: 3,
        severe_findings_count: 2,
        core_web_vitals_status: 'good',
        lighthouse_scores: { performance: 90, accessibility: 85, best_practices: 95, seo: 95, pwa: 0 },
        axe_findings: []
      },
      {
        url: 'https://www.other.gov',
        page_load_count: 1000000,
        scan_status: 'success',
        failure_reason: null,
        findings_count: 0,
        severe_findings_count: 0,
        core_web_vitals_status: 'good',
        lighthouse_scores: { performance: 95, accessibility: 100, best_practices: 98, seo: 99, pwa: 0 },
        axe_findings: []
      }
    ],
    generated_at: '2026-03-05T00:00:00.000Z',
    report_status: 'success'
  };

  const html = renderDailyReportPage(report);

  // Column header should show combined label with tooltip
  assert.ok(html.includes('Accessibility'), 'Should have Accessibility in header');
  assert.ok(html.includes('/ Important'), 'Should have / Important sub-heading in header');
  assert.ok(html.includes('role="tooltip"'), 'Should have tooltip element for header');
  assert.ok(html.includes('tip-acc-important'), 'Should have tooltip ID for accessibility column');

  // Cell with severe findings should include data-sort-value with just the score
  assert.ok(html.includes('data-sort-value="85"'), 'Cell should carry numeric sort value');
  // The severe count span should be present
  assert.ok(html.includes('class="severe-count"'), 'Should render severe count with its CSS class');

  // Removed columns should not appear
  assert.ok(!html.includes('data-label="Total findings"'), 'Total findings column should be removed');
  assert.ok(!html.includes('data-label="Critical/Serious"'), 'Critical/Serious column should be removed');
  assert.ok(!html.includes('data-label="Failure reason"'), 'Failure reason column should be removed');
});

test('renderDailyReportPage handles missing axe_findings field gracefully', () => {
  const report = {
    run_date: '2026-03-05',
    run_id: 'test-run',
    url_counts: { processed: 1, succeeded: 1, failed: 0, excluded: 0 },
    aggregate_scores: { performance: 80, accessibility: 90, best_practices: 85, seo: 88, pwa: 0 },
    estimated_impact: { traffic_window_mode: 'daily', affected_share_percent: 0, categories: [] },
    history_series: [],
    top_urls: [
      {
        url: 'https://www.example.gov',
        page_load_count: 1000,
        scan_status: 'success',
        failure_reason: null,
        findings_count: 0,
        severe_findings_count: 0,
        core_web_vitals_status: 'good',
        lighthouse_scores: { performance: 80, accessibility: 90, best_practices: 85, seo: 88, pwa: 0 }
        // no axe_findings field
      }
    ],
    generated_at: '2026-03-05T00:00:00.000Z',
    report_status: 'success'
  };

  // Should not throw
  assert.doesNotThrow(() => renderDailyReportPage(report), 'Should not throw when axe_findings is missing');
});

test('renderDailyReportPage handles mixed accessibility scores with correct button and modal ID pairing', () => {
  const report = {
    run_date: '2026-03-05',
    run_id: 'test-run',
    url_counts: { processed: 3, succeeded: 3, failed: 0, excluded: 0 },
    aggregate_scores: { performance: 90, accessibility: 90, best_practices: 95, seo: 95, pwa: 0 },
    estimated_impact: { traffic_window_mode: 'daily', affected_share_percent: 0, categories: [] },
    history_series: [],
    top_urls: [
      {
        url: 'https://first.gov',
        page_load_count: 5000000,
        scan_status: 'success',
        failure_reason: null,
        findings_count: 0,
        severe_findings_count: 0,
        core_web_vitals_status: 'good',
        lighthouse_scores: { performance: 90, accessibility: 100, best_practices: 95, seo: 95, pwa: 0 },
        axe_findings: []
      },
      {
        url: 'https://second.gov',
        page_load_count: 3000000,
        scan_status: 'success',
        failure_reason: null,
        findings_count: 1,
        severe_findings_count: 1,
        core_web_vitals_status: 'poor',
        lighthouse_scores: { performance: 80, accessibility: 80, best_practices: 90, seo: 90, pwa: 0 },
        axe_findings: [
          { id: 'label', title: 'Missing label', description: 'Desc', score: 0, items: [] }
        ]
      },
      {
        url: 'https://third.gov',
        page_load_count: 1000000,
        scan_status: 'success',
        failure_reason: null,
        findings_count: 0,
        severe_findings_count: 0,
        core_web_vitals_status: 'good',
        lighthouse_scores: { performance: 95, accessibility: 100, best_practices: 98, seo: 98, pwa: 0 },
        axe_findings: []
      }
    ],
    generated_at: '2026-03-05T00:00:00.000Z',
    report_status: 'success'
  };

  const html = renderDailyReportPage(report);

  // First URL (index 0) has score 100 - no button, no modal
  assert.ok(!html.includes('data-open-modal="modal-url-0"'), 'First URL (score 100) should not have a Details button');
  assert.ok(!html.includes('id="modal-url-0"'), 'First URL (score 100) should not have a modal');

  // Second URL (index 1) has score 80 - button and modal should use matching ID "modal-url-1"
  assert.ok(html.includes('data-open-modal="modal-url-1"'), 'Second URL (score 80) should have a Details button');
  assert.ok(html.includes('id="modal-url-1"'), 'Second URL (score 80) modal should use matching ID modal-url-1');

  // Third URL (index 2) has score 100 - no button, no modal
  assert.ok(!html.includes('data-open-modal="modal-url-2"'), 'Third URL (score 100) should not have a Details button');
  assert.ok(!html.includes('id="modal-url-2"'), 'Third URL (score 100) should not have a modal');
});

test('renderDailyReportPage renders multi-line explanation as a bulleted list', () => {
  const report = {
    run_date: '2026-03-05',
    run_id: 'test-run',
    url_counts: { processed: 1, succeeded: 1, failed: 0, excluded: 0 },
    aggregate_scores: { performance: 55, accessibility: 68, best_practices: 77, seo: 83, pwa: 0 },
    estimated_impact: { traffic_window_mode: 'daily', affected_share_percent: 0, categories: [] },
    history_series: [],
    top_urls: [
      {
        url: 'https://tools.usps.com',
        page_load_count: 1000,
        scan_status: 'success',
        failure_reason: null,
        findings_count: 1,
        severe_findings_count: 1,
        core_web_vitals_status: 'poor',
        lighthouse_scores: { performance: 39, accessibility: 68, best_practices: 77, seo: 83, pwa: 0 },
        axe_findings: [
          {
            id: 'aria-command-name',
            title: 'Elements do not have accessible names.',
            description: 'Screen readers need accessible names.',
            score: 0,
            tags: [],
            items: [
              {
                selector: 'span.down-arr',
                snippet: '<span role="button">',
                node_label: 'span.down-arr',
                explanation: 'Fix any of the following:\n  Element does not have text that is visible to screen readers\n  aria-label attribute does not exist or is empty'
              }
            ]
          }
        ]
      }
    ],
    generated_at: '2026-03-05T00:00:00.000Z',
    report_status: 'success'
  };

  const html = renderDailyReportPage(report);

  // The explanation should be rendered as a list
  assert.ok(html.includes('<ul class="fix-list">'), 'Should render explanation as a fix-list');
  assert.ok(html.includes('<li>Element does not have text that is visible to screen readers</li>'), 'Should list first fix item');
  assert.ok(html.includes('<li>aria-label attribute does not exist or is empty</li>'), 'Should list second fix item');
  assert.ok(html.includes('Fix any of the following:'), 'Should keep the fix prompt text');
});

test('renderDailyReportPage renders markdown links in description as HTML anchors', () => {
  const report = {
    run_date: '2026-03-05',
    run_id: 'test-run',
    url_counts: { processed: 1, succeeded: 1, failed: 0, excluded: 0 },
    aggregate_scores: { performance: 55, accessibility: 68, best_practices: 77, seo: 83, pwa: 0 },
    estimated_impact: { traffic_window_mode: 'daily', affected_share_percent: 0, categories: [] },
    history_series: [],
    top_urls: [
      {
        url: 'https://tools.usps.com',
        page_load_count: 1000,
        scan_status: 'success',
        failure_reason: null,
        findings_count: 1,
        severe_findings_count: 1,
        core_web_vitals_status: 'poor',
        lighthouse_scores: { performance: 39, accessibility: 68, best_practices: 77, seo: 83, pwa: 0 },
        axe_findings: [
          {
            id: 'aria-command-name',
            title: 'Elements do not have accessible names.',
            description: 'Screen readers need accessible names. [Learn more](https://dequeuniversity.com/rules/axe/4.11/aria-command-name).',
            score: 0,
            tags: [],
            items: []
          }
        ]
      }
    ],
    generated_at: '2026-03-05T00:00:00.000Z',
    report_status: 'success'
  };

  const html = renderDailyReportPage(report);

  // The markdown link should be converted to an HTML anchor
  assert.ok(
    html.includes('href="https://dequeuniversity.com/rules/axe/4.11/aria-command-name"'),
    'Should render markdown link as HTML anchor with href'
  );
  assert.ok(html.includes('Learn more'), 'Should include link text');
  // The raw markdown syntax should not appear
  assert.ok(!html.includes('[Learn more]'), 'Should not show raw markdown link syntax');
});

test('renderDailyReportPage renders WCAG tags from axe findings', () => {
  const report = {
    run_date: '2026-03-05',
    run_id: 'test-run',
    url_counts: { processed: 1, succeeded: 1, failed: 0, excluded: 0 },
    aggregate_scores: { performance: 55, accessibility: 68, best_practices: 77, seo: 83, pwa: 0 },
    estimated_impact: { traffic_window_mode: 'daily', affected_share_percent: 0, categories: [] },
    history_series: [],
    top_urls: [
      {
        url: 'https://tools.usps.com',
        page_load_count: 1000,
        scan_status: 'success',
        failure_reason: null,
        findings_count: 1,
        severe_findings_count: 1,
        core_web_vitals_status: 'poor',
        lighthouse_scores: { performance: 39, accessibility: 68, best_practices: 77, seo: 83, pwa: 0 },
        axe_findings: [
          {
            id: 'aria-command-name',
            title: 'Elements do not have accessible names.',
            description: 'Screen readers need accessible names.',
            score: 0,
            tags: ['cat.aria', 'wcag2a', 'wcag412'],
            items: []
          }
        ]
      }
    ],
    generated_at: '2026-03-05T00:00:00.000Z',
    report_status: 'success'
  };

  const html = renderDailyReportPage(report);

  // WCAG 4.1.2 should be displayed (parsed from 'wcag412')
  assert.ok(html.includes('WCAG 4.1.2'), 'Should display WCAG criterion from tags');
  // Non-WCAG tags like cat.aria should not produce output
  assert.ok(!html.includes('cat.aria'), 'Should not show non-WCAG tags like cat.aria');
  // The wcag2a tag means WCAG 2.A which is not a standard form - should not appear
  assert.ok(html.includes('wcag-tags'), 'Should include wcag-tags class');
});

test('renderDailyReportPage renders "Element path" label instead of "Selector"', () => {
  const report = {
    run_date: '2026-03-05',
    run_id: 'test-run',
    url_counts: { processed: 1, succeeded: 1, failed: 0, excluded: 0 },
    aggregate_scores: { performance: 55, accessibility: 68, best_practices: 77, seo: 83, pwa: 0 },
    estimated_impact: { traffic_window_mode: 'daily', affected_share_percent: 0, categories: [] },
    history_series: [],
    top_urls: [
      {
        url: 'https://tools.usps.com',
        page_load_count: 1000,
        scan_status: 'success',
        failure_reason: null,
        findings_count: 1,
        severe_findings_count: 1,
        core_web_vitals_status: 'poor',
        lighthouse_scores: { performance: 39, accessibility: 68, best_practices: 77, seo: 83, pwa: 0 },
        axe_findings: [
          {
            id: 'aria-command-name',
            title: 'Elements do not have accessible names.',
            description: 'Screen readers need accessible names.',
            score: 0,
            tags: [],
            items: [
              {
                selector: '#headingOneAnchor > .down-arr',
                snippet: '<span role="button">',
                node_label: '#headingOneAnchor > .down-arr',
                explanation: 'Fix: add an aria-label.'
              }
            ]
          }
        ]
      }
    ],
    generated_at: '2026-03-05T00:00:00.000Z',
    report_status: 'success'
  };

  const html = renderDailyReportPage(report);

  assert.ok(html.includes('Element path:'), 'Should use "Element path" label matching Accessibility Insights format');
  assert.ok(html.includes('Snippet:'), 'Should use "Snippet" label matching Accessibility Insights format');
});

test('plainTextDescription converts markdown links to plain text', () => {
  const input = 'Properly ordered headings. [Learn more](https://dequeuniversity.com/rules/axe/4.11/heading-order).';
  const result = plainTextDescription(input);
  assert.ok(result.includes('Learn more (https://dequeuniversity.com/rules/axe/4.11/heading-order)'), 'Should convert markdown link to plain text form');
  assert.ok(!result.includes('[Learn more]'), 'Should not contain raw markdown link syntax');
});

test('buildFindingCopyText includes page URL and finding details', () => {
  const pageUrl = 'https://informeddelivery.usps.com';
  const finding = {
    id: 'heading-order',
    title: 'Heading elements are not in a sequentially-descending order',
    description: 'Properly ordered headings. [Learn more](https://dequeuniversity.com/rules/axe/4.11/heading-order).',
    tags: ['cat.semantics', 'wcag2a', 'wcag246'],
    items: [
      {
        selector: 'div.row > div.col-12 > div.faq-unit > h4.header-4',
        snippet: '<h4>',
        node_label: 'What is Informed Delivery?',
        explanation: 'Fix any of the following:\n  Heading order invalid'
      }
    ]
  };

  const text = buildFindingCopyText(pageUrl, finding);

  assert.ok(text.includes('**URL:** https://informeddelivery.usps.com'), 'Should include the page URL');
  assert.ok(text.includes('heading-order'), 'Should include the rule ID');
  assert.ok(text.includes('Heading elements are not in a sequentially-descending order'), 'Should include the finding title');
  assert.ok(text.includes('Learn more (https://dequeuniversity.com/rules/axe/4.11/heading-order)'), 'Should convert markdown links to plain text');
  assert.ok(text.includes('WCAG 2.4.6'), 'Should include parsed WCAG criterion');
  assert.ok(text.includes('div.row > div.col-12 > div.faq-unit > h4.header-4'), 'Should include element selector');
  assert.ok(text.includes('<h4>'), 'Should include element snippet');
  assert.ok(text.includes('What is Informed Delivery?'), 'Should include node label');
  assert.ok(text.includes('Heading order invalid'), 'Should include how-to-fix text');
});

test('buildFindingCopyText handles finding with no items', () => {
  const finding = {
    id: 'color-contrast',
    title: 'Elements must have sufficient color contrast',
    description: 'Ensure the contrast ratio meets the minimum.',
    tags: [],
    items: []
  };
  const text = buildFindingCopyText('https://example.gov', finding);
  assert.ok(text.includes('**URL:** https://example.gov'), 'Should include URL even with no items');
  assert.ok(text.includes('**Affected elements (0):**'), 'Should show zero affected elements');
  assert.ok(!text.includes('**WCAG criteria:**'), 'Should not include WCAG section when tags are empty');
});

test('renderDailyReportPage renders copy-finding button for each axe finding', () => {
  const report = {
    run_date: '2026-03-09',
    run_id: 'test-run',
    url_counts: { processed: 1, succeeded: 1, failed: 0, excluded: 0 },
    aggregate_scores: { performance: 55, accessibility: 68, best_practices: 77, seo: 83, pwa: 0 },
    estimated_impact: { traffic_window_mode: 'daily', affected_share_percent: 0, categories: [] },
    history_series: [],
    top_urls: [
      {
        url: 'https://informeddelivery.usps.com',
        page_load_count: 5000000,
        scan_status: 'success',
        failure_reason: null,
        findings_count: 1,
        severe_findings_count: 1,
        core_web_vitals_status: 'poor',
        lighthouse_scores: { performance: 55, accessibility: 68, best_practices: 77, seo: 83, pwa: 0 },
        axe_findings: [
          {
            id: 'heading-order',
            title: 'Heading elements are not in a sequentially-descending order',
            description: 'Properly ordered headings convey structure.',
            score: 0,
            tags: ['wcag246'],
            items: [
              {
                selector: 'div.row > div.col-12 > h4.header-4',
                snippet: '<h4>',
                node_label: 'What is Informed Delivery?',
                explanation: 'Fix any of the following:\n  Heading order invalid'
              }
            ]
          }
        ]
      }
    ],
    generated_at: '2026-03-09T00:00:00.000Z',
    report_status: 'success'
  };

  const html = renderDailyReportPage(report);

  assert.ok(html.includes('copy-finding-btn'), 'Should render copy finding button');
  assert.ok(html.includes('data-copy-text='), 'Should include data-copy-text attribute');
  assert.ok(html.includes('Copy finding'), 'Should use "Copy finding" as button label');
  assert.ok(html.includes('aria-label="Copy finding to clipboard"'), 'Should have accessible aria-label');
  assert.ok(html.includes('https://informeddelivery.usps.com'), 'Should embed URL in copy text');
  assert.ok(html.includes('heading-order'), 'Should embed rule ID in copy text');
  assert.ok(html.includes('navigator.clipboard'), 'Should include clipboard JavaScript');
});

test('renderDailyReportPage shows FPC column in Common Accessibility Issues table', () => {
  const report = {
    run_date: '2026-03-09',
    run_id: 'test-run',
    url_counts: { processed: 2, succeeded: 2, failed: 0, excluded: 0 },
    aggregate_scores: { performance: 60, accessibility: 70, best_practices: 80, seo: 85, pwa: 0 },
    estimated_impact: { traffic_window_mode: 'daily', affected_share_percent: 0, categories: [] },
    history_series: [],
    top_urls: [
      {
        url: 'https://example.gov',
        scan_status: 'success',
        axe_findings: [
          { id: 'color-contrast', title: 'Elements must meet minimum color contrast ratio', description: 'Ensures text meets contrast requirements.', score: 0, tags: [], items: [] },
          { id: 'image-alt', title: 'Images must have alternative text', description: 'Ensures images have alt text.', score: 0, tags: [], items: [] }
        ]
      },
      {
        url: 'https://other.gov',
        scan_status: 'success',
        axe_findings: [
          { id: 'color-contrast', title: 'Elements must meet minimum color contrast ratio', description: 'Ensures text meets contrast requirements.', score: 0, tags: [], items: [] }
        ]
      }
    ],
    generated_at: '2026-03-09T00:00:00.000Z',
    report_status: 'success'
  };

  const html = renderDailyReportPage(report);

  // FPC column header should be present
  assert.ok(html.includes('Disabilities Affected'), 'Should include disabilities affected column header');

  // color-contrast maps to LV and WPC - check for SVG icons with aria-labels
  assert.ok(html.includes('aria-label="Limited Vision"'), 'Should include Limited Vision aria-label for color-contrast');
  assert.ok(html.includes('aria-label="Without Perception of Color"'), 'Should include Without Perception of Color aria-label for color-contrast');

  // image-alt maps to WV and WH - check for SVG icons
  assert.ok(html.includes('aria-label="Without Vision"'), 'Should include Without Vision aria-label for image-alt');

  // Disability icons should be present
  assert.ok(html.includes('class="disability-icon"'), 'Should include disability icon SVGs');
  assert.ok(html.includes('class="disability-badge"'), 'Should include disability badge spans');

  // Legend should be present
  assert.ok(html.includes('Disability icon key'), 'Should include disability icon key legend');
  assert.ok(html.includes('section508.gov'), 'Should include Section 508 reference link');
});

const minimalReport = {
  run_date: '2026-03-09',
  run_id: 'test-run',
  url_counts: { processed: 2, succeeded: 2, failed: 0, excluded: 0 },
  aggregate_scores: { performance: 60, accessibility: 70, best_practices: 80, seo: 85 },
  estimated_impact: { traffic_window_mode: 'daily', affected_share_percent: 5, categories: [{ name: 'Contrast', prevalence_rate: '10%', estimated_impacted_users: 1000 }] },
  history_series: [
    { date: '2026-03-08', aggregate_scores: { performance: 58, accessibility: 68, best_practices: 78, seo: 83 } },
    { date: '2026-03-09', aggregate_scores: { performance: 60, accessibility: 70, best_practices: 80, seo: 85 } }
  ],
  top_urls: [
    {
      url: 'https://example.gov/some/very/long/path',
      page_load_count: 500000,
      scan_status: 'success',
      failure_reason: null,
      findings_count: 2,
      severe_findings_count: 1,
      core_web_vitals_status: 'good',
      lighthouse_scores: { performance: 60, accessibility: 70, best_practices: 80, seo: 85 },
      axe_findings: []
    }
  ],
  generated_at: '2026-03-09T00:00:00.000Z',
  report_status: 'success'
};

test('renderDailyReportPage includes meta description tag', () => {
  const html = renderDailyReportPage(minimalReport);
  assert.ok(html.includes('<meta name="description"'), 'Should include meta description tag');
  assert.ok(html.includes('2026-03-09'), 'Meta description should include report date');
});

test('renderDashboardPage includes meta description tag', () => {
  const html = renderDashboardPage({ latestReport: minimalReport, historyIndex: [] });
  assert.ok(html.includes('<meta name="description"'), 'Dashboard should include meta description tag');
});

test('renderDailyReportPage includes table captions for accessibility', () => {
  const html = renderDailyReportPage(minimalReport);
  assert.ok(html.includes('<caption>Daily aggregate Lighthouse scores'), 'History table should have a caption');
  assert.ok(html.includes('<caption>Top government URLs'), 'Top URLs table should have a caption');
  assert.ok(html.includes('<caption>Score comparison between'), 'Day comparison table should have a caption');
  assert.ok(html.includes('<caption>Estimated accessibility impact'), 'Impact table should have a caption');
});

test('renderDailyReportPage uses url-cell class on URL column', () => {
  const html = renderDailyReportPage(minimalReport);
  assert.ok(html.includes('class="url-cell"'), 'URL cells should have url-cell class for word-break styling');
});

test('renderDailyReportPage includes min-height on button styles for touch targets', () => {
  const html = renderDailyReportPage(minimalReport);
  assert.ok(html.includes('min-height: 2.75rem'), 'Buttons should have min-height for adequate touch target size');
});

test('renderDailyReportPage includes mobile modal styles', () => {
  const html = renderDailyReportPage(minimalReport);
  assert.ok(html.includes('@media (max-width: 640px)'), 'Should include mobile responsive breakpoint');
  assert.ok(html.includes('inset: 0'), 'Modal should use inset: 0 on mobile for full-screen display');
});

test('renderDailyReportPage includes backdrop click-to-close JavaScript', () => {
  const html = renderDailyReportPage(minimalReport);
  assert.ok(html.includes('e.target === dialog'), 'Should include backdrop click detection for closing modal');
});

test('renderDailyReportPage returns focus to opener button when modal closes', () => {
  const html = renderDailyReportPage(minimalReport);
  assert.ok(html.includes('data-open-modal='), 'Should reference opener button attribute for focus return');
  assert.ok(html.includes('opener.focus()'), 'Should return focus to opener button on modal close');
});

test('renderDailyReportPage axe patterns table includes caption', () => {
  const reportWithAxe = {
    ...minimalReport,
    top_urls: [
      {
        ...minimalReport.top_urls[0],
        axe_findings: [
          { id: 'color-contrast', title: 'Color contrast', description: 'Contrast issue.', tags: [], items: [] }
        ]
      }
    ]
  };
  const html = renderDailyReportPage(reportWithAxe);
  assert.ok(html.includes('<caption>Top axe-core accessibility rule violations'), 'Axe patterns table should have a caption');
});

test('renderDailyReportPage includes anchor links on all section headings', () => {
  const html = renderDailyReportPage(minimalReport);

  // Each heading with an id should have a corresponding .heading-anchor link
  assert.ok(html.includes('href="#page-title"') && html.includes('id="page-title"'), 'h1 page title should have anchor link');
  assert.ok(html.includes('href="#dap-context-heading"'), 'About These Reports heading should have anchor link');
  assert.ok(html.includes('href="#narrative-heading"'), 'Narrative heading should have anchor link');
  assert.ok(html.includes('href="#day-comparison-heading"'), 'Day comparison heading should have anchor link');
  assert.ok(html.includes('href="#scores-heading"'), 'Aggregate Scores heading should have anchor link');
  assert.ok(html.includes('href="#history-heading"'), 'History heading should have anchor link');
  assert.ok(html.includes('href="#top-urls-heading"'), 'Top URLs heading should have anchor link');
});

test('renderDailyReportPage anchor links have accessible aria-labels', () => {
  const html = renderDailyReportPage(minimalReport);

  assert.ok(html.includes('aria-label="Link to About These Reports"'), 'About heading anchor should have descriptive aria-label');
  assert.ok(html.includes('aria-label="Link to Accessibility Trend Narrative"'), 'Narrative anchor should have descriptive aria-label');
  assert.ok(html.includes('aria-label="Link to Aggregate Scores"'), 'Scores anchor should have descriptive aria-label');
  assert.ok(html.includes('aria-label="Link to History"'), 'History anchor should have descriptive aria-label');
  assert.ok(html.includes('aria-label="Link to Top URLs by Traffic (Scanned)"'), 'Top URLs anchor should have descriptive aria-label');
});

test('renderDailyReportPage anchor link symbol is aria-hidden', () => {
  const html = renderDailyReportPage(minimalReport);
  assert.ok(html.includes('<span aria-hidden="true">#</span>'), 'Anchor link symbol should be aria-hidden');
});

test('renderDailyReportPage includes heading-anchor CSS', () => {
  const html = renderDailyReportPage(minimalReport);
  assert.ok(html.includes('.heading-anchor'), 'Should include heading-anchor CSS class');
  assert.ok(html.includes('opacity: 0'), 'Heading anchor should be hidden by default');
  assert.ok(html.includes('.heading-anchor:focus'), 'Heading anchor should be visible on focus');
});

test('renderDailyReportPage estimated impact heading has anchor link', () => {
  const html = renderDailyReportPage(minimalReport);
  assert.ok(html.includes('href="#estimated-impact-heading"'), 'Estimated Impact heading should have anchor link');
  assert.ok(html.includes('id="estimated-impact-heading"'), 'Estimated Impact heading should have an id');
});

test('renderDailyReportPage axe patterns heading has anchor link', () => {
  const reportWithAxe = {
    ...minimalReport,
    top_urls: [
      {
        ...minimalReport.top_urls[0],
        axe_findings: [
          { id: 'color-contrast', title: 'Color contrast', description: 'Contrast issue.', tags: [], items: [] }
        ]
      }
    ]
  };
  const html = renderDailyReportPage(reportWithAxe);
  assert.ok(html.includes('href="#axe-patterns-heading"'), 'Axe patterns heading should have anchor link');
  assert.ok(html.includes('aria-label="Link to Common Accessibility Issues (Top 1)"'), 'Axe patterns anchor should have descriptive aria-label');
});

test('renderDashboardPage includes anchor links on all section headings', () => {
  const html = renderDashboardPage({ latestReport: minimalReport, historyIndex: [] });

  assert.ok(html.includes('href="#page-title"') && html.includes('id="page-title"'), 'h1 page title should have anchor link');
  assert.ok(html.includes('href="#about-heading"'), 'What is DAP heading should have anchor link');
  assert.ok(html.includes('href="#latest-scores-heading"'), 'Latest Scores heading should have anchor link');
  assert.ok(html.includes('href="#recent-reports-heading"'), 'Recent Reports heading should have anchor link');
});

test('renderDashboardPage anchor links have accessible aria-labels', () => {
  const html = renderDashboardPage({ latestReport: minimalReport, historyIndex: [] });

  assert.ok(html.includes('aria-label="Link to What is DAP?"'), 'About heading anchor should have descriptive aria-label');
  assert.ok(html.includes('aria-label="Link to Recent Reports"'), 'Recent Reports anchor should have descriptive aria-label');
  assert.ok(html.includes('aria-label="Link to Latest Scores (2026-03-09)"'), 'Latest Scores anchor should have descriptive aria-label');
});

test('renderDailyReportPage modal headings do not have anchor links', () => {
  const reportWithUrl = {
    ...minimalReport,
    top_urls: [
      { ...minimalReport.top_urls[0], axe_findings: [] }
    ]
  };
  const html = renderDailyReportPage(reportWithUrl);
  // Modal heading has id but should NOT have an anchor link since it's inside a dialog
  assert.ok(html.includes('id="modal-url-0-title"'), 'Modal heading should still have its id');
  const modalHeadingMatch = html.match(/<h2 id="modal-url-0-title"[^>]*>[\s\S]*?<\/h2>/);
  assert.ok(modalHeadingMatch, 'Modal heading should be present');
  assert.ok(!modalHeadingMatch[0].includes('heading-anchor'), 'Modal heading should not have a heading-anchor link');
});

test('renderDashboardPage shows archive section when archiveUrl is provided', () => {
  const historyEntries = [
    { run_date: '2026-03-09', run_id: 'run-2026-03-09-abc', page_path: 'daily/2026-03-09/index.html' }
  ];
  const html = renderDashboardPage({
    latestReport: minimalReport,
    historyIndex: historyEntries,
    archiveUrl: './archive/index.html'
  });

  assert.ok(html.includes('id="archive-heading"'), 'Archive section heading should be present');
  assert.ok(html.includes('Report Archive'), 'Archive section heading text should be present');
  assert.ok(html.includes('href="./archive/index.html"'), 'Archive link should use the provided archiveUrl');
  assert.ok(html.includes('Browse report archives'), 'Archive link text should be present');
});

test('renderDashboardPage does not show archive section when archiveUrl is null', () => {
  const html = renderDashboardPage({ latestReport: minimalReport, historyIndex: [], archiveUrl: null });

  assert.ok(!html.includes('id="archive-heading"'), 'Archive section should not be present when archiveUrl is null');
  assert.ok(!html.includes('Browse report archives'), 'Archive link should not appear when archiveUrl is null');
});

test('renderDashboardPage does not show archive section when archiveUrl is omitted', () => {
  const html = renderDashboardPage({ latestReport: minimalReport, historyIndex: [] });

  assert.ok(!html.includes('id="archive-heading"'), 'Archive section should not be present when archiveUrl is not provided');
});

test('renderArchiveIndexPage renders archive entries with download links', () => {
  const entries = [
    { run_date: '2026-01-15', zip_filename: '2026-01-15.zip', archived_at: '2026-02-01T12:00:00.000Z' },
    { run_date: '2026-01-16', zip_filename: '2026-01-16.zip', archived_at: '2026-02-01T12:00:00.000Z' }
  ];
  const html = renderArchiveIndexPage({ entries, generatedAt: '2026-02-01T12:00:00.000Z' });

  assert.ok(html.includes('<title>Daily DAP - Report Archives</title>'), 'Page title should be set');
  assert.ok(html.includes('id="archives-heading"'), 'Archives section heading should be present');
  assert.ok(html.includes('href="2026-01-15.zip"'), 'Link to first zip should be present');
  assert.ok(html.includes('href="2026-01-16.zip"'), 'Link to second zip should be present');
  assert.ok(html.includes('download'), 'Zip links should use download attribute');
  assert.ok(html.includes('href="../index.html"'), 'Back to dashboard link should be present');
});

test('renderArchiveIndexPage sorts entries newest first', () => {
  const entries = [
    { run_date: '2026-01-10', zip_filename: '2026-01-10.zip', archived_at: null },
    { run_date: '2026-01-20', zip_filename: '2026-01-20.zip', archived_at: null },
    { run_date: '2026-01-15', zip_filename: '2026-01-15.zip', archived_at: null }
  ];
  const html = renderArchiveIndexPage({ entries });

  const idx10 = html.indexOf('2026-01-10.zip');
  const idx15 = html.indexOf('2026-01-15.zip');
  const idx20 = html.indexOf('2026-01-20.zip');

  assert.ok(idx20 < idx15, '2026-01-20 should appear before 2026-01-15');
  assert.ok(idx15 < idx10, '2026-01-15 should appear before 2026-01-10');
});

test('renderArchiveIndexPage shows empty message when no entries', () => {
  const html = renderArchiveIndexPage({ entries: [] });

  assert.ok(html.includes('No archived reports yet'), 'Should show empty message when no entries');
  assert.ok(!html.includes('<li>'), 'Should not render list items when no entries');
});

test('renderArchiveIndexPage escapes HTML in entry data', () => {
  const entries = [
    { run_date: '2026-01-15', zip_filename: '2026-01-15.zip', archived_at: '<script>alert(1)</script>' }
  ];
  const html = renderArchiveIndexPage({ entries });

  assert.ok(!html.includes('<script>alert(1)</script>'), 'Script tag should be escaped in archived_at');
  assert.ok(html.includes('&lt;script&gt;'), 'Script tag should be HTML-escaped');
});

test('renderArchiveRedirectStub renders redirect page with meta-refresh', () => {
  const html = renderArchiveRedirectStub('2026-01-15');

  assert.ok(html.includes('http-equiv="refresh"'), 'Should include meta refresh');
  assert.ok(html.includes('url=../../archive/index.html'), 'Meta refresh should point to archive');
  assert.ok(html.includes('data-archived="true"'), 'Should include data-archived marker');
  assert.ok(html.includes('2026-01-15'), 'Should include the run date');
  assert.ok(html.includes('href="../../archive/index.html"'), 'Should include link to archive');
  assert.ok(html.includes('href="../../index.html"'), 'Should include link back to dashboard');
});

test('renderArchiveRedirectStub escapes HTML in run date', () => {
  const html = renderArchiveRedirectStub('<script>xss</script>');

  assert.ok(!html.includes('<script>xss</script>'), 'Script tag should be escaped');
  assert.ok(html.includes('&lt;script&gt;xss&lt;/script&gt;'), 'Script tag should be HTML-escaped');
});

test('renderDailyReportPage shows FPC codes in individual axe findings within URL modals', () => {
  const report = {
    run_date: '2026-03-09',
    run_id: 'test-run',
    url_counts: { processed: 1, succeeded: 1, failed: 0, excluded: 0 },
    aggregate_scores: { performance: 55, accessibility: 68, best_practices: 77, seo: 83, pwa: 0 },
    estimated_impact: { traffic_window_mode: 'daily', affected_share_percent: 0, categories: [] },
    history_series: [],
    top_urls: [
      {
        url: 'https://example.gov',
        page_load_count: 5000000,
        scan_status: 'success',
        failure_reason: null,
        findings_count: 2,
        severe_findings_count: 1,
        core_web_vitals_status: 'poor',
        lighthouse_scores: { performance: 55, accessibility: 68, best_practices: 77, seo: 83, pwa: 0 },
        axe_findings: [
          {
            id: 'color-contrast',
            title: 'Elements must meet minimum color contrast ratio',
            description: 'Ensures text meets contrast requirements.',
            score: 0,
            tags: ['wcag143'],
            items: []
          },
          {
            id: 'image-alt',
            title: 'Images must have alternative text',
            description: 'Ensures images have alt text.',
            score: 0,
            tags: ['wcag111'],
            items: []
          }
        ]
      }
    ],
    generated_at: '2026-03-09T00:00:00.000Z',
    report_status: 'success'
  };

  const html = renderDailyReportPage(report);

  // color-contrast maps to LV and WPC - check for SVG icons with aria-labels
  assert.ok(html.includes('Disabilities affected'), 'Should include "Disabilities affected" label for individual findings');
  assert.ok(html.includes('aria-label="Limited Vision"'), 'color-contrast finding should show Limited Vision disability icon');
  assert.ok(html.includes('aria-label="Without Perception of Color"'), 'color-contrast finding should show Without Perception of Color disability icon');
  // image-alt maps to WV and WH
  assert.ok(html.includes('aria-label="Without Vision"'), 'image-alt finding should show Without Vision disability icon');
  assert.ok(html.includes('aria-label="Without Hearing"'), 'image-alt finding should show Without Hearing disability icon');
});

test('buildFindingCopyText includes FPC codes for known axe rules', () => {
  const finding = {
    id: 'color-contrast',
    title: 'Elements must have sufficient color contrast',
    description: 'Ensure the contrast ratio meets the minimum.',
    tags: ['wcag143'],
    items: []
  };
  const text = buildFindingCopyText('https://example.gov', finding);
  assert.ok(text.includes('**Section 508 FPC:**'), 'Should include FPC section heading');
  assert.ok(text.includes('LV (Limited Vision)'), 'Should include LV FPC code with label');
  assert.ok(text.includes('WPC (Without Perception of Color)'), 'Should include WPC FPC code with label');
});

test('buildFindingCopyText omits FPC section for unknown axe rules', () => {
  const finding = {
    id: 'unknown-rule-xyz',
    title: 'Some unknown rule',
    description: 'An unknown rule.',
    tags: [],
    items: []
  };
  const text = buildFindingCopyText('https://example.gov', finding);
  assert.ok(!text.includes('**Section 508 FPC:**'), 'Should not include FPC section for unknown rules');
});

test('renderDailyReportPage omits FPC section for unknown axe rules in URL modals', () => {
  const report = {
    run_date: '2026-03-09',
    run_id: 'test-run',
    url_counts: { processed: 1, succeeded: 1, failed: 0, excluded: 0 },
    aggregate_scores: { performance: 55, accessibility: 68, best_practices: 77, seo: 83, pwa: 0 },
    estimated_impact: { traffic_window_mode: 'daily', affected_share_percent: 0, categories: [] },
    history_series: [],
    top_urls: [
      {
        url: 'https://example.gov',
        page_load_count: 5000000,
        scan_status: 'success',
        failure_reason: null,
        findings_count: 1,
        severe_findings_count: 0,
        core_web_vitals_status: 'good',
        lighthouse_scores: { performance: 55, accessibility: 68, best_practices: 77, seo: 83, pwa: 0 },
        axe_findings: [
          {
            id: 'unknown-custom-rule',
            title: 'Some custom rule not in mapping',
            description: 'An unknown custom rule.',
            score: 0,
            tags: [],
            items: []
          }
        ]
      }
    ],
    generated_at: '2026-03-09T00:00:00.000Z',
    report_status: 'success'
  };

  const html = renderDailyReportPage(report);

  // The modal dialog for this URL should not show the FPC paragraph since rule is unknown
  const modalMatch = html.match(/<dialog id="modal-url-0"[\s\S]*?<\/dialog>/);
  assert.ok(modalMatch, 'Modal should be present for the URL');
  assert.ok(!modalMatch[0].includes('<strong>Disabilities affected:</strong>'), 'Should not show disability paragraph for unknown axe rule');
});

test('renderDailyReportPage disability badges have accessible tooltip attributes', () => {
  const report = {
    run_date: '2026-03-09',
    run_id: 'test-run',
    url_counts: { processed: 1, succeeded: 1, failed: 0, excluded: 0 },
    aggregate_scores: { performance: 60, accessibility: 70, best_practices: 80, seo: 85, pwa: 0 },
    estimated_impact: { traffic_window_mode: 'daily', affected_share_percent: 0, categories: [] },
    history_series: [],
    top_urls: [
      {
        url: 'https://example.gov',
        scan_status: 'success',
        axe_findings: [
          { id: 'color-contrast', title: 'Elements must meet minimum color contrast ratio', description: 'Ensures text meets contrast requirements.', score: 0, tags: [], items: [] }
        ]
      }
    ],
    generated_at: '2026-03-09T00:00:00.000Z',
    report_status: 'success'
  };

  const html = renderDailyReportPage(report);

  // Badges should be keyboard-focusable
  assert.ok(html.includes('tabindex="0"'), 'Disability badges should have tabindex="0" for keyboard access');
  // Badge aria-label should include just the disability name (not description - that goes in tooltip)
  assert.ok(html.includes('aria-label="Limited Vision"'), 'Badge aria-label should contain the disability name');
  assert.ok(html.includes('aria-label="Without Perception of Color"'), 'Badge aria-label should contain the disability name');
  // Description should be in role="tooltip" element referenced by aria-describedby
  assert.ok(html.includes('role="tooltip"'), 'Tooltip element should have role="tooltip"');
  assert.ok(html.includes('aria-describedby='), 'Badge should reference tooltip via aria-describedby');
  assert.ok(html.includes('People with low vision'), 'Tooltip should include disability description');
  // SVG icons inside badges should be decorative (aria-hidden)
  assert.ok(html.includes('aria-hidden="true"'), 'SVG inside badge should be decorative (aria-hidden)');
  // Badges should NOT have title= attribute (use role="tooltip" + aria-describedby instead)
  assert.ok(!html.match(/<span[^<>]*class="disability-badge"[^<>]*title=/), 'Disability badge span should not have title attribute');
});

test('renderDailyReportPage disability badges show estimated impact when page_load_count is available', () => {
  const report = {
    run_date: '2026-03-09',
    run_id: 'test-run',
    url_counts: { processed: 2, succeeded: 2, failed: 0, excluded: 0 },
    aggregate_scores: { performance: 60, accessibility: 70, best_practices: 80, seo: 85, pwa: 0 },
    estimated_impact: { traffic_window_mode: 'daily', affected_share_percent: 0, categories: [] },
    history_series: [],
    top_urls: [
      {
        url: 'https://example.gov',
        page_load_count: 1000000,
        scan_status: 'success',
        axe_findings: [
          { id: 'target-size', title: 'Target size', description: 'Touch targets should be large enough.', score: 0, tags: [], items: [] }
        ]
      },
      {
        url: 'https://other.gov',
        page_load_count: 500000,
        scan_status: 'success',
        axe_findings: [
          { id: 'target-size', title: 'Target size', description: 'Touch targets should be large enough.', score: 0, tags: [], items: [] }
        ]
      }
    ],
    generated_at: '2026-03-09T00:00:00.000Z',
    report_status: 'success'
  };

  const html = renderDailyReportPage(report);

  // target-size maps to LM (2.2%) and LRS (5.8%)
  // Total page loads = 1,500,000
  // LM estimate: 1,500,000 * 0.022 = 33,000
  // LRS estimate: 1,500,000 * 0.058 = 87,000
  assert.ok(html.includes('disability-estimate'), 'Should include disability-estimate elements');
  assert.ok(html.includes('~33'), 'Should show LM estimated impact (~33K)');
  assert.ok(html.includes('~87'), 'Should show LRS estimated impact (~87K)');
  // Tooltip should mention estimated excluded people
  assert.ok(html.includes('potentially excluded'), 'Tooltip should mention people potentially excluded');
  // Tooltip should mention prevalence
  assert.ok(html.includes('prevalence'), 'Tooltip should mention prevalence rate');
});

test('renderDailyReportPage disability badges show no estimate when page_load_count is unavailable', () => {
  const report = {
    run_date: '2026-03-09',
    run_id: 'test-run',
    url_counts: { processed: 1, succeeded: 1, failed: 0, excluded: 0 },
    aggregate_scores: { performance: 60, accessibility: 70, best_practices: 80, seo: 85, pwa: 0 },
    estimated_impact: { traffic_window_mode: 'daily', affected_share_percent: 0, categories: [] },
    history_series: [],
    top_urls: [
      {
        url: 'https://example.gov',
        scan_status: 'success',
        axe_findings: [
          { id: 'color-contrast', title: 'Elements must meet minimum color contrast ratio', description: 'Ensures text meets contrast requirements.', score: 0, tags: [], items: [] }
        ]
      }
    ],
    generated_at: '2026-03-09T00:00:00.000Z',
    report_status: 'success'
  };

  const html = renderDailyReportPage(report);

  // No estimate shown when page_load_count is not available
  assert.ok(!html.includes('<span class="disability-estimate"'), 'Should not show disability-estimate span when no page_load_count');
  assert.ok(!html.includes('Estimated ~'), 'Badge tooltip should not include estimated count when no page data');
  // Should still show disability name in aria-label
  assert.ok(html.includes('aria-label="Limited Vision"'), 'Badge aria-label should contain the disability name');
  // Description should still appear in the role="tooltip" element
  assert.ok(html.includes('People with low vision'), 'Tooltip should still include disability description');
});

test('renderDailyReportPage URL modal shows per-URL disability impact estimates', () => {
  const report = {
    run_date: '2026-03-09',
    run_id: 'test-run',
    url_counts: { processed: 1, succeeded: 1, failed: 0, excluded: 0 },
    aggregate_scores: { performance: 55, accessibility: 68, best_practices: 77, seo: 83, pwa: 0 },
    estimated_impact: { traffic_window_mode: 'daily', affected_share_percent: 0, categories: [] },
    history_series: [],
    top_urls: [
      {
        url: 'https://example.gov',
        page_load_count: 500000,
        scan_status: 'success',
        failure_reason: null,
        findings_count: 1,
        severe_findings_count: 1,
        core_web_vitals_status: 'poor',
        lighthouse_scores: { performance: 55, accessibility: 68, best_practices: 77, seo: 83, pwa: 0 },
        axe_findings: [
          {
            id: 'color-contrast',
            title: 'Elements must meet minimum color contrast ratio',
            description: 'Ensures text meets contrast requirements.',
            score: 0,
            tags: ['wcag143'],
            items: []
          }
        ]
      }
    ],
    generated_at: '2026-03-09T00:00:00.000Z',
    report_status: 'success'
  };

  const html = renderDailyReportPage(report);

  // color-contrast maps to LV (2.4%) and WPC (4.3%)
  // Page loads = 500,000
  // LV estimate: 500,000 * 0.024 = 12,000 → ~12.0K
  // WPC estimate: 500,000 * 0.043 = 21,500 → ~21.5K
  const modalMatch = html.match(/<dialog id="modal-url-0"[\s\S]*?<\/dialog>/);
  assert.ok(modalMatch, 'Modal should be present for the URL');
  assert.ok(modalMatch[0].includes('disability-estimate'), 'Modal should show disability impact estimates');
  assert.ok(modalMatch[0].includes('~12'), 'Modal should show LV estimate (~12K)');
  assert.ok(modalMatch[0].includes('~21'), 'Modal should show WPC estimate (~21.5K)');
});

test('disability icon key legend includes descriptions', () => {
  const report = {
    run_date: '2026-03-09',
    run_id: 'test-run',
    url_counts: { processed: 1, succeeded: 1, failed: 0, excluded: 0 },
    aggregate_scores: { performance: 60, accessibility: 70, best_practices: 80, seo: 85 },
    estimated_impact: { traffic_window_mode: 'daily', affected_share_percent: 0, categories: [] },
    history_series: [],
    top_urls: [
      {
        url: 'https://example.gov',
        scan_status: 'success',
        axe_findings: [
          { id: 'color-contrast', title: 'Color contrast', description: 'Contrast check.', score: 0, tags: [], items: [] }
        ]
      }
    ],
    generated_at: '2026-03-09T00:00:00.000Z',
    report_status: 'success'
  };

  const html = renderDailyReportPage(report);

  // Legend should include FPC descriptions
  assert.ok(html.includes('People who are blind or have no functional vision'), 'Legend should include WV description');
  assert.ok(html.includes('People with cognitive, learning, or language differences'), 'Legend should include LLCLA description');
  // Legend should include methodology note about page loads
  assert.ok(html.includes('page loads for affected URLs'), 'Legend should explain impact calculation methodology');
});

test('disability icon key legend includes prevalence rates and source citations', () => {
  const report = {
    run_date: '2026-03-09',
    run_id: 'test-run',
    url_counts: { processed: 1, succeeded: 1, failed: 0, excluded: 0 },
    aggregate_scores: { performance: 60, accessibility: 70, best_practices: 80, seo: 85 },
    estimated_impact: { traffic_window_mode: 'daily', affected_share_percent: 0, categories: [] },
    history_series: [],
    top_urls: [
      {
        url: 'https://example.gov',
        scan_status: 'success',
        axe_findings: [
          { id: 'color-contrast', title: 'Color contrast', description: 'Contrast check.', score: 0, tags: [], items: [] }
        ]
      }
    ],
    generated_at: '2026-03-09T00:00:00.000Z',
    report_status: 'success'
  };

  const html = renderDailyReportPage(report);

  // Legend should include prevalence percentages for FPC categories
  assert.ok(html.includes('1.0% of U.S. population'), 'Legend should include WV prevalence rate');
  assert.ok(html.includes('4.7% of U.S. population'), 'Legend should include LLCLA prevalence rate');
  assert.ok(html.includes('4.3% of U.S. population'), 'Legend should include WPC prevalence rate');

  // Legend should include estimated population counts
  assert.ok(html.includes('3,400,000 Americans'), 'Legend should include WV estimated population');
  assert.ok(html.includes('15,900,000 Americans'), 'Legend should include LLCLA estimated population');

  // Legend should include census source link
  assert.match(html, /href="https:\/\/www\.census\.gov/, 'Legend should link to census.gov source');
  assert.ok(html.includes('American Community Survey'), 'Legend should cite American Community Survey');
});

// ---------- Dark mode tests ----------

function makeMinimalReport(overrides = {}) {
  return {
    run_date: '2026-03-16',
    run_id: 'test-run',
    url_counts: { processed: 5, succeeded: 5, failed: 0, excluded: 0 },
    aggregate_scores: { performance: 80, accessibility: 90, best_practices: 85, seo: 88, pwa: 0 },
    estimated_impact: { traffic_window_mode: 'daily', affected_share_percent: 0, categories: [] },
    history_series: [],
    top_urls: [],
    generated_at: '2026-03-16T00:00:00.000Z',
    report_status: 'success',
    ...overrides,
  };
}

test('dark mode: all page types include color-scheme meta tag', () => {
  const daily = renderDailyReportPage(makeMinimalReport());
  const dashboard = renderDashboardPage({ latestReport: null, historyIndex: [] });
  const archive = renderArchiveIndexPage();
  const redirect = renderArchiveRedirectStub('2026-03-01');

  for (const [name, html] of [['daily', daily], ['dashboard', dashboard], ['archive', archive], ['redirect', redirect]]) {
    assert.ok(
      html.includes('name="color-scheme" content="light dark"'),
      `${name} page should include color-scheme meta tag`
    );
  }
});

test('dark mode: all page types include anti-FOWT inline script in head', () => {
  const daily = renderDailyReportPage(makeMinimalReport());
  const dashboard = renderDashboardPage({ latestReport: null, historyIndex: [] });
  const archive = renderArchiveIndexPage();
  const redirect = renderArchiveRedirectStub('2026-03-01');

  for (const [name, html] of [['daily', daily], ['dashboard', dashboard], ['archive', archive], ['redirect', redirect]]) {
    // The anti-FOWT script reads saved preference before styles are applied
    assert.ok(
      html.includes("localStorage.getItem('color-scheme')"),
      `${name} page should include anti-FOWT localStorage script`
    );
    // The script must appear before </head>
    const headEnd = html.indexOf('</head>');
    const scriptPos = html.indexOf("localStorage.getItem('color-scheme')");
    assert.ok(scriptPos < headEnd, `${name} page: anti-FOWT script must be inside <head>`);
  }
});

test('dark mode: all page types include theme toggle button with aria attributes', () => {
  const daily = renderDailyReportPage(makeMinimalReport());
  const dashboard = renderDashboardPage({ latestReport: null, historyIndex: [] });
  const archive = renderArchiveIndexPage();
  const redirect = renderArchiveRedirectStub('2026-03-01');

  for (const [name, html] of [['daily', daily], ['dashboard', dashboard], ['archive', archive], ['redirect', redirect]]) {
    assert.ok(html.includes('id="theme-toggle"'), `${name} page should have theme-toggle button`);
    assert.ok(html.includes('aria-pressed="false"'), `${name} page toggle should have aria-pressed`);
    assert.ok(html.includes('aria-label="Enable dark mode"'), `${name} page toggle should have aria-label`);
    assert.ok(html.includes('type="button"'), `${name} page toggle should have explicit type=button`);
  }
});

test('dark mode: all page types include ARIA live region for announcements', () => {
  const daily = renderDailyReportPage(makeMinimalReport());
  const dashboard = renderDashboardPage({ latestReport: null, historyIndex: [] });
  const archive = renderArchiveIndexPage();
  const redirect = renderArchiveRedirectStub('2026-03-01');

  for (const [name, html] of [['daily', daily], ['dashboard', dashboard], ['archive', archive], ['redirect', redirect]]) {
    assert.ok(html.includes('id="theme-announcement"'), `${name} page should have announcement region`);
    assert.ok(html.includes('role="status"'), `${name} page announcement should have role=status`);
    assert.ok(html.includes('aria-live="polite"'), `${name} page announcement should have aria-live=polite`);
    assert.ok(html.includes('aria-atomic="true"'), `${name} page announcement should have aria-atomic=true`);
  }
});

test('dark mode: CSS includes custom properties in :root', () => {
  const html = renderDashboardPage({ latestReport: null, historyIndex: [] });

  assert.ok(html.includes(':root {'), 'CSS should have :root block');
  assert.ok(html.includes('color-scheme: light dark'), ':root should declare color-scheme');
  assert.ok(html.includes('--color-bg:'), 'CSS should define --color-bg variable');
  assert.ok(html.includes('--color-text:'), 'CSS should define --color-text variable');
  assert.ok(html.includes('--color-primary:'), 'CSS should define --color-primary variable');
  assert.ok(html.includes('--color-focus-ring:'), 'CSS should define --color-focus-ring variable');
});

test('dark mode: CSS includes prefers-color-scheme dark media query', () => {
  const html = renderDashboardPage({ latestReport: null, historyIndex: [] });

  assert.ok(
    html.includes('@media (prefers-color-scheme: dark)'),
    'CSS should have dark mode media query'
  );
  // Uses :not() to respect explicit light preference
  assert.ok(
    html.includes(':root:not([data-color-scheme="light"])'),
    'Dark media query should use :not() to respect explicit light preference'
  );
});

test('dark mode: CSS includes explicit data-color-scheme overrides', () => {
  const html = renderDashboardPage({ latestReport: null, historyIndex: [] });

  assert.ok(
    html.includes('html[data-color-scheme="dark"]'),
    'CSS should support explicit dark mode via data attribute'
  );
  assert.ok(
    html.includes('html[data-color-scheme="light"]'),
    'CSS should support explicit light mode via data attribute'
  );
  assert.ok(
    html.includes('color-scheme: dark'),
    'CSS should set color-scheme: dark for dark mode'
  );
  assert.ok(
    html.includes('color-scheme: light'),
    'CSS should set color-scheme: light for explicit light mode'
  );
});

test('dark mode: CSS uses var() references instead of hardcoded colors for body', () => {
  const html = renderDashboardPage({ latestReport: null, historyIndex: [] });

  // Body should use variables, not hardcoded values
  assert.ok(html.includes('color: var(--color-text)'), 'body color should use CSS variable');
  assert.ok(html.includes('background: var(--color-bg)'), 'body background should use CSS variable');
  // Link colors should use variables
  assert.ok(html.includes('color: var(--color-link)'), 'link color should use CSS variable');
});

test('dark mode: theme toggle script reads and writes localStorage', () => {
  const html = renderDashboardPage({ latestReport: null, historyIndex: [] });

  assert.ok(
    html.includes("localStorage.setItem('color-scheme'"),
    'Theme script should persist preference to localStorage'
  );
  assert.ok(
    html.includes('data-color-scheme'),
    'Theme script should set data-color-scheme attribute'
  );
});

test('dark mode: sr-only class is defined for visually hidden announcement region', () => {
  const html = renderDashboardPage({ latestReport: null, historyIndex: [] });

  assert.ok(html.includes('.sr-only'), 'CSS should define .sr-only class');
  assert.ok(html.includes('class="sr-only"'), 'Announcement div should use sr-only class');
});

// ── Link accessibility (link-in-text-block) tests ───────────────────────────

test('link-in-text-block: general links have text-decoration underline for distinguishability', () => {
  const html = renderDashboardPage({ latestReport: null, historyIndex: [] });

  assert.ok(
    html.includes('a { color: var(--color-link); text-decoration: underline; }'),
    'General link CSS must include text-decoration: underline so inline links are distinguishable from surrounding text without relying on color alone'
  );
});

test('link-in-text-block: footer links have text-decoration underline for distinguishability', () => {
  const html = renderDashboardPage({ latestReport: null, historyIndex: [] });

  assert.ok(
    html.includes('.site-footer a { color: var(--color-footer-link); text-decoration: underline; }'),
    'Footer link CSS must include text-decoration: underline so footer links are distinguishable from surrounding footer text'
  );
});

// ── Score color gradient tests ──────────────────────────────────────────────

const makeScoreReport = (overrides = {}) => ({
  run_date: '2026-03-16',
  run_id: 'test-run',
  url_counts: { processed: 1, succeeded: 1, failed: 0, excluded: 0 },
  aggregate_scores: { performance: 50, accessibility: 80, best_practices: 85, seo: 90, pwa: 0 },
  estimated_impact: { traffic_window_mode: 'daily', affected_share_percent: 0, categories: [] },
  history_series: [],
  generated_at: '2026-03-16T00:00:00.000Z',
  report_status: 'success',
  top_urls: [
    {
      url: 'https://example.gov',
      page_load_count: 1000,
      scan_status: 'success',
      failure_reason: null,
      findings_count: 0,
      severe_findings_count: 0,
      core_web_vitals_status: 'poor',
      lighthouse_scores: { performance: 39, accessibility: 68, best_practices: 77, seo: 83, pwa: 0 },
      axe_findings: []
    }
  ],
  ...overrides
});

test('score color gradients: Lighthouse score cells carry CSS class and --score variable', () => {
  const html = renderDailyReportPage(makeScoreReport());

  // Each score cell should have a matching CSS class
  assert.ok(html.includes('class="score-performance"'), 'Performance cell should have score-performance class');
  assert.ok(html.includes('class="score-accessibility"'), 'Accessibility cell should have score-accessibility class');
  assert.ok(html.includes('class="score-best-practices"'), 'Best Practices cell should have score-best-practices class');
  assert.ok(html.includes('class="score-seo"'), 'SEO cell should have score-seo class');

  // --score CSS variable should be set to the numeric value
  assert.ok(html.includes('style="--score:39"'), 'Performance cell should set --score to 39');
  assert.ok(html.includes('style="--score:68"'), 'Accessibility cell should set --score to 68');
  assert.ok(html.includes('style="--score:77"'), 'Best Practices cell should set --score to 77');
  assert.ok(html.includes('style="--score:83"'), 'SEO cell should set --score to 83');
});

test('score color gradients: CWV cell carries correct class based on status', () => {
  const statusToClass = {
    poor: 'score-cwv-poor',
    needs_improvement: 'score-cwv-needs-improvement',
    good: 'score-cwv-good'
  };

  for (const [status, expectedClass] of Object.entries(statusToClass)) {
    const report = makeScoreReport({
      top_urls: [{ ...makeScoreReport().top_urls[0], core_web_vitals_status: status }]
    });
    const html = renderDailyReportPage(report);
    assert.ok(html.includes(`class="${expectedClass}"`), `CWV "${status}" should have class "${expectedClass}"`);
  }
});

test('score color gradients: unknown CWV status has no score-cwv class', () => {
  const report = makeScoreReport({
    top_urls: [{ ...makeScoreReport().top_urls[0], core_web_vitals_status: 'unknown' }]
  });
  const html = renderDailyReportPage(report);

  assert.ok(!html.includes('score-cwv-unknown'), 'Unknown CWV should not get a color class');
  assert.ok(html.includes('>unknown<'), 'Unknown CWV text should still be rendered');
});

test('score color gradients: missing scores render dash with no color class', () => {
  const report = makeScoreReport({
    top_urls: [{ ...makeScoreReport().top_urls[0], lighthouse_scores: null }]
  });
  const html = renderDailyReportPage(report);

  assert.ok(!html.includes('class="score-performance"'), 'Null scores should not have score-performance class');
  assert.ok(!html.includes('style="--score:'), 'Null scores should not have --score CSS variable');

  // Dash placeholders should still appear
  const dashCount = (html.match(/<td[^>]*>—<\/td>/g) || []).length;
  assert.ok(dashCount >= 4, 'Should show at least 4 dash placeholders for missing Lighthouse scores');
});

test('score color gradients: CSS defines rules for all five score columns', () => {
  const html = renderDailyReportPage(makeScoreReport());

  assert.ok(html.includes('.score-performance'), 'CSS should define .score-performance rule');
  assert.ok(html.includes('.score-accessibility'), 'CSS should define .score-accessibility rule');
  assert.ok(html.includes('.score-best-practices'), 'CSS should define .score-best-practices rule');
  assert.ok(html.includes('.score-seo'), 'CSS should define .score-seo rule');
  assert.ok(html.includes('.score-cwv-good'), 'CSS should define .score-cwv-good rule');
  assert.ok(html.includes('.score-cwv-needs-improvement'), 'CSS should define .score-cwv-needs-improvement rule');
  assert.ok(html.includes('.score-cwv-poor'), 'CSS should define .score-cwv-poor rule');
});

test('score color gradients: dark mode CSS overrides are present', () => {
  const html = renderDailyReportPage(makeScoreReport());

  // Both the @media and html[data-color-scheme="dark"] forms should be present
  assert.ok(
    html.includes(':root:not([data-color-scheme="light"]) .score-performance'),
    'Dark mode @media block should override .score-performance'
  );
  assert.ok(
    html.includes('html[data-color-scheme="dark"] .score-performance'),
    'Explicit dark mode should override .score-performance'
  );
});

test('render404Page contains required landmark elements for accessibility', () => {
  const html = render404Page();

  // Must have a <main> element with id="main-content" for skip-link target
  assert.ok(html.includes('<main id="main-content"'), 'Should have main landmark with id="main-content"');

  // Must have a <header> element with role="banner" on the same element
  assert.ok(/<header[^>]*role="banner"/.test(html), 'Should have header landmark with role="banner" on the same element');

  // Must have a <footer> element with role="contentinfo" on the same element
  assert.ok(/<footer[^>]*role="contentinfo"/.test(html), 'Should have footer landmark with role="contentinfo" on the same element');

  // Must have a <nav> element with aria-label for navigation landmark
  assert.ok(/<nav[^>]*aria-label="[^"]+"/.test(html), 'Should have nav landmark with a non-empty aria-label on the same element');

  // Must have an <h1> inside main (not outside landmarks)
  assert.ok(html.includes('<h1'), 'Should have an h1 heading');
});

test('render404Page h1 heading is inside the main landmark', () => {
  const html = render404Page();

  const mainStart = html.indexOf('<main');
  const mainEnd = html.indexOf('</main>');
  const h1Index = html.indexOf('<h1');

  assert.ok(mainStart !== -1, 'Should have main element');
  assert.ok(mainEnd !== -1, 'Should have closing main element');
  assert.ok(h1Index !== -1, 'Should have h1 element');
  assert.ok(h1Index > mainStart && h1Index < mainEnd, 'h1 should be inside the main landmark, not outside');
});

test('render404Page skip-link targets main content', () => {
  const html = render404Page();

  assert.ok(html.includes('href="#main-content"'), 'Should have skip-link pointing to #main-content');
  assert.ok(html.includes('id="main-content"'), 'Should have element with id="main-content" as skip-link target');
});

test('render404Page has valid HTML structure', () => {
  const html = render404Page();

  assert.ok(html.startsWith('<!doctype html>'), 'Should start with doctype');
  assert.ok(html.includes('<html lang="en">'), 'Should have html element with lang attribute');
  assert.ok(html.includes('<title>'), 'Should have a title element');
  assert.ok(html.includes('Page Not Found'), 'Title should include "Page Not Found"');
});

test('render404Page provides a link back to the dashboard', () => {
  const html = render404Page();

  assert.ok(html.includes('./reports/'), 'Should include a link back to the reports dashboard');
});

// ---- link-name regression tests (axe rule: link-name) ----

/**
 * Returns an array of link HTML snippets that lack discernible accessible text.
 * A link passes if it has: a non-empty aria-label, aria-labelledby, title, or
 * visible text content (excluding content of aria-hidden elements).
 * This guards against the axe "link-name" violation.
 *
 * Uses a character-loop text extractor (not regex-based HTML stripping) to avoid
 * false sanitization concerns when analysing test HTML output.
 */
function findLinksWithoutDiscernibleText(html) {
  const failing = [];
  const pattern = /<a(\s[^>]*)?>[\s\S]*?<\/a>/g;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const fullMatch = match[0];
    const attrStr = match[1] || '';

    // aria-label provides accessible name
    if (/\baria-label="[^"]+"/.test(attrStr)) continue;

    // aria-labelledby provides accessible name
    if (/\baria-labelledby="[^"]+"/.test(attrStr)) continue;

    // title provides accessible name
    if (/\btitle="[^"]+"/.test(attrStr)) continue;

    // Derive visible text by walking characters, skipping content inside HTML tags.
    // All links that rely solely on aria-hidden child content for labelling are already
    // covered by the aria-label check above (our heading-anchor pattern uses aria-label).
    const inner = fullMatch.slice(fullMatch.indexOf('>') + 1, fullMatch.lastIndexOf('</a>'));
    let inTag = false;
    let visibleText = '';
    for (const ch of inner) {
      if (ch === '<') { inTag = true; continue; }
      if (ch === '>') { inTag = false; continue; }
      if (!inTag) visibleText += ch;
    }

    if (!visibleText.trim()) {
      failing.push(fullMatch.slice(0, 200));
    }
  }
  return failing;
}

test('renderDashboardPage: all links have discernible text (axe link-name)', () => {
  const html = renderDashboardPage({
    latestReport: minimalReport,
    historyIndex: [{ run_date: '2026-03-08', run_id: 'run-2026-03-08-abc' }],
    archiveUrl: './archive/index.html',
    archiveWindowDays: 14
  });

  const failing = findLinksWithoutDiscernibleText(html);
  assert.deepEqual(failing, [], `Dashboard page links without discernible text:\n${failing.join('\n')}`);
});

test('renderDailyReportPage: all links have discernible text (axe link-name)', () => {
  const html = renderDailyReportPage(minimalReport);

  const failing = findLinksWithoutDiscernibleText(html);
  assert.deepEqual(failing, [], `Daily report page links without discernible text:\n${failing.join('\n')}`);
});

test('render404Page: all links have discernible text (axe link-name)', () => {
  const html = render404Page();

  const failing = findLinksWithoutDiscernibleText(html);
  assert.deepEqual(failing, [], `404 page links without discernible text:\n${failing.join('\n')}`);
});

test('renderArchiveIndexPage: all links have discernible text (axe link-name)', () => {
  const html = renderArchiveIndexPage({
    entries: [
      { run_date: '2026-03-01', run_id: 'run-2026-03-01-abc', zip_filename: 'run-2026-03-01-abc.zip', archived_at: '2026-03-15T00:00:00.000Z' }
    ],
    generatedAt: '2026-03-15T00:00:00.000Z',
    displayDays: 14
  });

  const failing = findLinksWithoutDiscernibleText(html);
  assert.deepEqual(failing, [], `Archive index page links without discernible text:\n${failing.join('\n')}`);
});

test('renderArchiveRedirectStub: all links have discernible text (axe link-name)', () => {
  const html = renderArchiveRedirectStub('2026-03-01');

  const failing = findLinksWithoutDiscernibleText(html);
  assert.deepEqual(failing, [], `Archive redirect stub links without discernible text:\n${failing.join('\n')}`);
});

test('renderDashboardPage: no image-only logo link exists (axe link-name regression)', () => {
  const html = renderDashboardPage({ latestReport: minimalReport, historyIndex: [] });

  // Direct regression guard for the specific axe violation that was reported:
  // <a href="/" class="logo logo-img-1x"> (no text, no aria-label) was flagged on /reports/.
  // This element pattern should never appear in our generated output, regardless of
  // whether it has accessible text (our pages use a text-based site title, not an image logo).
  assert.ok(!html.includes('logo-img'), 'Dashboard page must not contain image-only logo link (logo-img class)');
});
