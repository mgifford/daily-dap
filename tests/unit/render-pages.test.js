import test from 'node:test';
import assert from 'node:assert/strict';
import { renderDailyReportPage, renderDashboardPage, buildFindingCopyText, plainTextDescription } from '../../src/publish/render-pages.js';

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
  assert.ok(html.includes('<td>39</td>'), 'Should include performance score 39 for tools.usps.com');
  assert.ok(html.includes('<td>68</td>'), 'Should include accessibility score 68 for tools.usps.com');
  assert.ok(html.includes('<td>77</td>'), 'Should include best_practices score 77 for tools.usps.com');
  assert.ok(html.includes('<td>83</td>'), 'Should include seo score 83 for tools.usps.com');

  // Scores for second URL should appear
  assert.ok(html.includes('<td>70</td>'), 'Should include performance score 70 for pmc.ncbi.nlm.nih.gov');
  assert.ok(html.includes('<td>100</td>'), 'Should include accessibility score 100 for pmc.ncbi.nlm.nih.gov');
  assert.ok(html.includes('<td>96</td>'), 'Should include best_practices score 96 for pmc.ncbi.nlm.nih.gov');
  assert.ok(html.includes('<td>92</td>'), 'Should include seo score 92 for pmc.ncbi.nlm.nih.gov');
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
  const dashCount = (html.match(/<td>—<\/td>/g) || []).length;
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

  // Table should have Details column header
  assert.ok(html.includes('>Axe details<'), 'Should have Axe details column header');

  // Details button should be present
  assert.ok(html.includes('class="details-btn"'), 'Should have details button');
  assert.ok(html.includes('aria-haspopup="dialog"'), 'Details button should indicate dialog popup');
  assert.ok(html.includes('data-open-modal="modal-url-0"'), 'Details button should use data attribute to open modal');

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
  assert.ok(html.includes('data-open-modal="modal-url-0"'), 'Should include modal open attribute');
  assert.ok(html.includes('<dialog'), 'Should render modal dialog');
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
  assert.ok(html.includes('Section 508 FPC'), 'Should include FPC column header');

  // color-contrast maps to LV and WPC
  assert.ok(html.includes('<abbr title="Limited Vision">LV</abbr>'), 'Should include LV abbr for color-contrast');
  assert.ok(html.includes('<abbr title="Without Perception of Color">WPC</abbr>'), 'Should include WPC abbr for color-contrast');

  // image-alt maps to WV and WH
  assert.ok(html.includes('<abbr title="Without Vision">WV</abbr>'), 'Should include WV abbr for image-alt');

  // FPC legend (details/summary) should be present
  assert.ok(html.includes('Functional Performance Criteria (FPC) key'), 'Should include FPC legend');
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

  // color-contrast maps to LV and WPC
  assert.ok(html.includes('Section 508 FPC'), 'Should include FPC label for individual findings');
  assert.ok(html.includes('<abbr title="Limited Vision">LV</abbr>'), 'color-contrast finding should show LV FPC code');
  assert.ok(html.includes('<abbr title="Without Perception of Color">WPC</abbr>'), 'color-contrast finding should show WPC FPC code');
  // image-alt maps to WV and WH
  assert.ok(html.includes('<abbr title="Without Vision">WV</abbr>'), 'image-alt finding should show WV FPC code');
  assert.ok(html.includes('<abbr title="Without Hearing">WH</abbr>'), 'image-alt finding should show WH FPC code');
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
  assert.ok(!modalMatch[0].includes('<strong>Section 508 FPC:</strong>'), 'Should not show FPC paragraph for unknown axe rule');
});
