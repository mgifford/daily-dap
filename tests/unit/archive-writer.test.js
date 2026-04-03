import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildHistoryCsv, buildAxeFindingsCsv, buildAxeFindingsReport, writeCommittedSnapshot } from '../../src/publish/archive-writer.js';

// ---------------------------------------------------------------------------
// buildHistoryCsv
// ---------------------------------------------------------------------------

test('buildHistoryCsv returns CSV header row', () => {
  const csv = buildHistoryCsv([]);
  const firstLine = csv.split('\n')[0];
  assert.equal(firstLine, 'date,performance,accessibility,best_practices,seo');
});

test('buildHistoryCsv returns header-only CSV for empty input', () => {
  const csv = buildHistoryCsv([]);
  const lines = csv.trim().split('\n');
  assert.equal(lines.length, 1);
});

test('buildHistoryCsv returns header-only CSV for no-arg call', () => {
  const csv = buildHistoryCsv();
  const lines = csv.trim().split('\n');
  assert.equal(lines.length, 1);
});

test('buildHistoryCsv adds one data row per history entry', () => {
  const csv = buildHistoryCsv([
    { date: '2024-11-14', aggregate_scores: { performance: 75, accessibility: 85, best_practices: 80, seo: 82 } },
    { date: '2024-11-15', aggregate_scores: { performance: 80, accessibility: 90, best_practices: 85, seo: 88 } }
  ]);
  const lines = csv.trim().split('\n');
  assert.equal(lines.length, 3);
});

test('buildHistoryCsv data row contains date and scores', () => {
  const csv = buildHistoryCsv([
    { date: '2024-11-15', aggregate_scores: { performance: 80, accessibility: 90, best_practices: 85, seo: 88 } }
  ]);
  const dataLine = csv.trim().split('\n')[1];
  assert.ok(dataLine.startsWith('2024-11-15'), 'row starts with date');
  assert.ok(dataLine.includes('80'), 'row includes performance score');
  assert.ok(dataLine.includes('90'), 'row includes accessibility score');
});

test('buildHistoryCsv skips entries missing date or aggregate_scores', () => {
  const csv = buildHistoryCsv([
    { aggregate_scores: { performance: 80, accessibility: 90, best_practices: 85, seo: 88 } },
    { date: '2024-11-15' },
    { date: '2024-11-16', aggregate_scores: { performance: 75, accessibility: 85, best_practices: 80, seo: 82 } }
  ]);
  const lines = csv.trim().split('\n');
  assert.equal(lines.length, 2, 'only the complete entry should produce a row');
  assert.ok(lines[1].startsWith('2024-11-16'));
});

test('buildHistoryCsv escapes values containing commas', () => {
  const csv = buildHistoryCsv([
    { date: '2024,11,15', aggregate_scores: { performance: 80, accessibility: 90, best_practices: 85, seo: 88 } }
  ]);
  assert.ok(csv.includes('"2024,11,15"'), 'date with commas should be quoted');
});

test('buildHistoryCsv ends with a newline', () => {
  const csv = buildHistoryCsv([]);
  assert.ok(csv.endsWith('\n'), 'CSV should end with newline');
});

test('buildHistoryCsv uses empty string for null/undefined scores', () => {
  const csv = buildHistoryCsv([
    { date: '2024-11-15', aggregate_scores: { performance: null, accessibility: undefined, best_practices: 80, seo: 88 } }
  ]);
  const dataLine = csv.trim().split('\n')[1];
  // null/undefined score fields should produce empty columns
  assert.ok(dataLine.startsWith('2024-11-15,,'), 'null scores should be empty in CSV');
});

// ---------------------------------------------------------------------------
// buildAxeFindingsReport
// ---------------------------------------------------------------------------

test('buildAxeFindingsReport returns object with expected fields', () => {
  const report = buildAxeFindingsReport({ run_date: '2024-11-15', run_id: 'run-abc', generated_at: '2024-11-15T12:00:00.000Z', top_urls: [] });
  assert.ok('run_date' in report);
  assert.ok('run_id' in report);
  assert.ok('generated_at' in report);
  assert.ok('total_urls' in report);
  assert.ok('total_findings' in report);
  assert.ok('urls' in report);
});

test('buildAxeFindingsReport total_urls equals length of top_urls', () => {
  const report = buildAxeFindingsReport({
    run_date: '2024-11-15',
    run_id: 'run-abc',
    generated_at: '2024-11-15T12:00:00.000Z',
    top_urls: [
      { url: 'https://a.gov/', scan_status: 'success', axe_findings: [] },
      { url: 'https://b.gov/', scan_status: 'success', axe_findings: [] }
    ]
  });
  assert.equal(report.total_urls, 2);
});

test('buildAxeFindingsReport total_findings sums all axe_findings counts', () => {
  const report = buildAxeFindingsReport({
    run_date: '2024-11-15',
    run_id: 'run-abc',
    generated_at: '2024-11-15T12:00:00.000Z',
    top_urls: [
      { url: 'https://a.gov/', scan_status: 'success', axe_findings: [{ id: 'color-contrast' }, { id: 'image-alt' }] },
      { url: 'https://b.gov/', scan_status: 'success', axe_findings: [{ id: 'label' }] }
    ]
  });
  assert.equal(report.total_findings, 3);
});

test('buildAxeFindingsReport handles null top_urls gracefully', () => {
  const report = buildAxeFindingsReport({ run_date: '2024-11-15', run_id: 'run-abc', generated_at: '2024-11-15T12:00:00.000Z' });
  assert.equal(report.total_urls, 0);
  assert.equal(report.total_findings, 0);
  assert.deepEqual(report.urls, []);
});

test('buildAxeFindingsReport url entries include url, scan_status, axe_findings_count, axe_findings', () => {
  const report = buildAxeFindingsReport({
    run_date: '2024-11-15',
    run_id: 'run-abc',
    generated_at: '2024-11-15T12:00:00.000Z',
    top_urls: [
      { url: 'https://a.gov/', scan_status: 'success', axe_findings: [{ id: 'label' }] }
    ]
  });
  const urlEntry = report.urls[0];
  assert.equal(urlEntry.url, 'https://a.gov/');
  assert.equal(urlEntry.scan_status, 'success');
  assert.equal(urlEntry.axe_findings_count, 1);
  assert.equal(urlEntry.axe_findings.length, 1);
});

test('buildAxeFindingsReport defaults axe_findings to empty array when not present', () => {
  const report = buildAxeFindingsReport({
    run_date: '2024-11-15',
    run_id: 'run-abc',
    generated_at: '2024-11-15T12:00:00.000Z',
    top_urls: [{ url: 'https://a.gov/', scan_status: 'failed' }]
  });
  assert.deepEqual(report.urls[0].axe_findings, []);
  assert.equal(report.urls[0].axe_findings_count, 0);
});

// ---------------------------------------------------------------------------
// buildAxeFindingsCsv
// ---------------------------------------------------------------------------

test('buildAxeFindingsCsv returns CSV with header row', () => {
  const csv = buildAxeFindingsCsv({ urls: [] });
  const firstLine = csv.split('\n')[0];
  assert.ok(firstLine.includes('url'), 'header should include url column');
  assert.ok(firstLine.includes('finding_id'), 'header should include finding_id column');
});

test('buildAxeFindingsCsv ends with a newline', () => {
  const csv = buildAxeFindingsCsv({ urls: [] });
  assert.ok(csv.endsWith('\n'));
});

test('buildAxeFindingsCsv adds a row with empty findings for URL with no findings', () => {
  const csv = buildAxeFindingsCsv({
    urls: [{ url: 'https://a.gov/', scan_status: 'success', axe_findings: [] }]
  });
  const lines = csv.trim().split('\n');
  assert.equal(lines.length, 2, 'header + one data row for URL with no findings');
  assert.ok(lines[1].startsWith('https://a.gov/'));
});

test('buildAxeFindingsCsv adds a row per finding item', () => {
  const csv = buildAxeFindingsCsv({
    urls: [
      {
        url: 'https://a.gov/',
        scan_status: 'success',
        axe_findings: [
          { id: 'color-contrast', title: 'Contrast', description: 'desc', score: 0, tags: ['wcag2aa'], items: [{ selector: 'p', snippet: '<p>', node_label: 'para', explanation: 'text' }] }
        ]
      }
    ]
  });
  const lines = csv.trim().split('\n');
  // header + 1 item row
  assert.equal(lines.length, 2);
  assert.ok(lines[1].includes('color-contrast'));
  assert.ok(lines[1].includes('https://a.gov/'));
});

test('buildAxeFindingsCsv adds one row per finding when finding has no items', () => {
  const csv = buildAxeFindingsCsv({
    urls: [
      {
        url: 'https://a.gov/',
        scan_status: 'success',
        axe_findings: [
          { id: 'color-contrast', title: 'Contrast', description: 'desc', score: 0, tags: [], items: [] }
        ]
      }
    ]
  });
  const lines = csv.trim().split('\n');
  assert.equal(lines.length, 2, 'header + one row for finding with no items');
});

test('buildAxeFindingsCsv escapes values containing commas and quotes', () => {
  const csv = buildAxeFindingsCsv({
    urls: [
      {
        url: 'https://a.gov/',
        scan_status: 'success',
        axe_findings: [
          { id: 'test', title: 'Title, with comma', description: 'She said "hello"', score: 0, tags: [], items: [] }
        ]
      }
    ]
  });
  assert.ok(csv.includes('"Title, with comma"'), 'comma in value should be quoted');
  assert.ok(csv.includes('She said ""hello""'), 'quotes should be doubled');
});

// ---------------------------------------------------------------------------
// writeCommittedSnapshot - integration test using temp directory
// ---------------------------------------------------------------------------

test('writeCommittedSnapshot creates expected output files', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dap-archive-writer-test-'));

  const report = {
    run_date: '2024-11-15',
    run_id: 'run-2024-11-15-test',
    url_limit: 10,
    url_counts: { processed: 1, succeeded: 1, failed: 0, excluded: 0 },
    aggregate_scores: { performance: 80, accessibility: 90, best_practices: 85, seo: 88, pwa: 0 },
    estimated_impact: { traffic_window_mode: 'daily', affected_share_percent: 10, categories: [] },
    fpc_exclusion: null,
    performance_impact: null,
    top_urls: [],
    tech_summary: {},
    code_quality_summary: { total_scanned: 0, urls_with_deprecated_apis: 0, urls_with_console_errors: 0, urls_with_document_write: 0, urls_with_vulnerable_libraries: 0, js_library_counts: {}, vulnerable_library_counts: {}, audit_urls: { deprecated_apis: [], console_errors: [], document_write: [], vulnerable_libraries: [] } },
    readability_summary: null,
    trend_window_days: 30,
    history_series: [],
    generated_at: '2024-11-15T12:00:00.000Z',
    report_status: 'success',
    source_data_date: null
  };

  const historyIndex = {
    entries: [{ run_date: '2024-11-15', run_id: 'run-2024-11-15-test', report_path: 'daily/2024-11-15/report.json', page_path: 'daily/2024-11-15/index.html', generated_at: '2024-11-15T12:00:00.000Z' }]
  };

  try {
    const result = await writeCommittedSnapshot({ repoRoot: tmpDir, report, historyIndex });

    assert.ok(typeof result === 'object', 'should return an object');
    assert.ok('report_json_path' in result);
    assert.ok('report_page_path' in result);
    assert.ok('history_index_path' in result);
    assert.ok('dashboard_page_path' in result);
    assert.ok('axe_findings_path' in result);
    assert.ok('axe_findings_csv_path' in result);
    assert.ok('lighthouse_history_csv_path' in result);
    assert.ok('press_release_path' in result);

    // Verify files were actually written
    for (const key of ['report_json_path', 'report_page_path', 'history_index_path', 'dashboard_page_path']) {
      const filePath = result[key];
      const stat = await fs.stat(filePath).catch(() => null);
      assert.ok(stat !== null, `${key} file should exist at ${filePath}`);
    }

    // Verify report.json content
    const reportJson = JSON.parse(await fs.readFile(result.report_json_path, 'utf8'));
    assert.equal(reportJson.run_date, '2024-11-15');
    assert.equal(reportJson.run_id, 'run-2024-11-15-test');

    // Verify HTML files
    const dailyHtml = await fs.readFile(result.report_page_path, 'utf8');
    assert.ok(dailyHtml.startsWith('<!doctype html>'), 'daily report page should be valid HTML');

    const dashboardHtml = await fs.readFile(result.dashboard_page_path, 'utf8');
    assert.ok(dashboardHtml.startsWith('<!doctype html>'), 'dashboard page should be valid HTML');

    // Verify CSV files
    const historyCsv = await fs.readFile(result.lighthouse_history_csv_path, 'utf8');
    assert.ok(historyCsv.includes('date,performance'), 'history CSV should have header');

    const axeCsv = await fs.readFile(result.axe_findings_csv_path, 'utf8');
    assert.ok(axeCsv.includes('url'), 'axe CSV should have url column');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
