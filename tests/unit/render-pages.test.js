import test from 'node:test';
import assert from 'node:assert/strict';
import { renderDailyReportPage } from '../../src/publish/render-pages.js';

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
  const historyTableMatch = html.match(/<h2>History<\/h2>[\s\S]*?<\/table>/);
  assert.ok(historyTableMatch, 'History table should exist');
  
  const historyTable = historyTableMatch[0];
  const date27Index = historyTable.indexOf('2026-02-27');
  const date26Index = historyTable.indexOf('2026-02-26');
  const date25Index = historyTable.indexOf('2026-02-25');
  
  // Most recent (27) should come before older dates (26, 25)
  assert.ok(date27Index < date26Index, 'Date 2026-02-27 should appear before 2026-02-26');
  assert.ok(date26Index < date25Index, 'Date 2026-02-26 should appear before 2026-02-25');
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
  
  // Monthly averages should have special styling
  assert.ok(html.includes('background-color: #f0f0f0; font-weight: bold;'), 'Monthly averages should have special styling');
});
