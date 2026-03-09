import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateAccessibilitySummary } from '../../src/cli/generate-accessibility-summary.js';

async function buildTempWorkspace(options = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dap-summary-test-'));
  const reportsRoot = path.join(root, 'docs', 'reports');
  const dailyDir = path.join(reportsRoot, 'daily', '2026-03-08');
  await fs.mkdir(dailyDir, { recursive: true });

  const report = options.report ?? {
    run_date: '2026-03-08',
    run_id: 'run-2026-03-08-test',
    url_counts: { processed: 10, succeeded: 9, failed: 1, excluded: 0 },
    aggregate_scores: { performance: 49, accessibility: 92, best_practices: 85, seo: 89, pwa: 0 },
    history_series: [
      { date: '2026-03-07', aggregate_scores: { performance: 48, accessibility: 91, best_practices: 86, seo: 90, pwa: 0 } }
    ],
    generated_at: '2026-03-08T09:00:00.000Z',
    report_status: 'partial'
  };

  const axeData = options.axeData ?? {
    run_date: '2026-03-08',
    run_id: 'run-2026-03-08-test',
    generated_at: '2026-03-08T09:00:00.000Z',
    total_urls: 10,
    total_findings: 5,
    urls: [
      {
        url: 'https://example.gov',
        scan_status: 'success',
        axe_findings_count: 2,
        axe_findings: [
          { id: 'color-contrast', title: 'Insufficient color contrast', score: 0, items: [] },
          { id: 'image-alt', title: 'Images missing alt text', score: 0, items: [] }
        ]
      },
      {
        url: 'https://another.gov',
        scan_status: 'success',
        axe_findings_count: 1,
        axe_findings: [
          { id: 'color-contrast', title: 'Insufficient color contrast', score: 0, items: [] }
        ]
      }
    ]
  };

  const history = options.history ?? {
    generated_at: '2026-03-08T09:00:00.000Z',
    lookback_days: 31,
    entries: [
      { run_date: '2026-03-08', run_id: 'run-2026-03-08-test', report_path: 'daily/2026-03-08/report.json', page_path: 'daily/2026-03-08/index.html', generated_at: '2026-03-08T09:00:00.000Z' }
    ]
  };

  await fs.writeFile(path.join(reportsRoot, 'history.json'), JSON.stringify(history, null, 2), 'utf8');
  await fs.writeFile(path.join(dailyDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
  await fs.writeFile(path.join(dailyDir, 'axe-findings.json'), JSON.stringify(axeData, null, 2), 'utf8');

  return root;
}

test('generateAccessibilitySummary includes run date and scores', async () => {
  const root = await buildTempWorkspace();
  const summary = await generateAccessibilitySummary(root, '2026-03-08');

  assert.ok(summary.includes('2026-03-08'), 'Summary should include run date');
  assert.ok(summary.includes('Performance'), 'Summary should include Performance score');
  assert.ok(summary.includes('Accessibility'), 'Summary should include Accessibility score');
  assert.ok(summary.includes('92'), 'Summary should include accessibility score value');
  assert.ok(summary.includes('49'), 'Summary should include performance score value');
});

test('generateAccessibilitySummary includes day-over-day delta', async () => {
  const root = await buildTempWorkspace();
  const summary = await generateAccessibilitySummary(root, '2026-03-08');

  assert.ok(summary.includes('+1'), 'Summary should show positive delta for accessibility');
  assert.ok(summary.includes('2026-03-07'), 'Summary should reference previous day');
  assert.ok(summary.includes('Trend'), 'Summary should include trend section');
});

test('generateAccessibilitySummary lists most common axe rules', async () => {
  const root = await buildTempWorkspace();
  const summary = await generateAccessibilitySummary(root, '2026-03-08');

  assert.ok(summary.includes('color-contrast'), 'Summary should include most common rule');
  assert.ok(summary.includes('image-alt'), 'Summary should include second most common rule');
  assert.ok(summary.includes('Common Accessibility Issues'), 'Summary should have patterns section');
});

test('generateAccessibilitySummary works with no prior history', async () => {
  const reportNoHistory = {
    run_date: '2026-03-08',
    run_id: 'run-2026-03-08-test',
    url_counts: { processed: 5, succeeded: 5, failed: 0, excluded: 0 },
    aggregate_scores: { performance: 55, accessibility: 90, best_practices: 88, seo: 91, pwa: 0 },
    history_series: [],
    generated_at: '2026-03-08T09:00:00.000Z',
    report_status: 'success'
  };
  const root = await buildTempWorkspace({ report: reportNoHistory });
  const summary = await generateAccessibilitySummary(root, '2026-03-08');

  assert.ok(summary.includes('2026-03-08'), 'Should still generate summary without prior history');
  assert.ok(!summary.includes('vs previous day'), 'Should not show delta without prior history');
});

test('generateAccessibilitySummary uses history.json to determine date when no date provided', async () => {
  const root = await buildTempWorkspace();
  const summary = await generateAccessibilitySummary(root, null);

  assert.ok(summary.includes('2026-03-08'), 'Should use date from history.json');
});
