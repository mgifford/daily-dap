import test from 'node:test';
import assert from 'node:assert/strict';
import { renderDailyReportPage, renderDashboardPage } from '../../src/publish/render-pages.js';

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

  // Table should include Lighthouse score column headers
  assert.ok(html.includes('>LH Performance<'), 'Should have LH Performance column header');
  assert.ok(html.includes('>LH Accessibility<'), 'Should have LH Accessibility column header');
  assert.ok(html.includes('>LH Best Practices<'), 'Should have LH Best Practices column header');
  assert.ok(html.includes('>LH SEO<'), 'Should have LH SEO column header');

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

  assert.ok(html.includes('No accessibility findings'), 'Should show no findings message for empty axe_findings');
  assert.ok(html.includes('<dialog'), 'Should still render dialog element');
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
