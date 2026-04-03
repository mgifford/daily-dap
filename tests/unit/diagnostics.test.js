import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRunDiagnostics } from '../../src/scanners/diagnostics.js';

test('buildRunDiagnostics returns zeroed object for empty results', () => {
  const diag = buildRunDiagnostics([]);

  assert.equal(diag.total_urls, 0);
  assert.equal(diag.success_count, 0);
  assert.equal(diag.failed_count, 0);
  assert.equal(diag.excluded_count, 0);
  assert.equal(diag.timeout_count, 0);
  assert.equal(diag.retry_count, 0);
  assert.deepEqual(diag.failure_reasons, {});
});

test('buildRunDiagnostics counts success, failed, and excluded correctly', () => {
  const diag = buildRunDiagnostics([
    { scan_status: 'success' },
    { scan_status: 'success' },
    { scan_status: 'failed', failure_reason: 'lighthouse_error' },
    { scan_status: 'excluded', failure_reason: 'excluded_by_limit' }
  ]);

  assert.equal(diag.total_urls, 4);
  assert.equal(diag.success_count, 2);
  assert.equal(diag.failed_count, 1);
  assert.equal(diag.excluded_count, 1);
});

test('buildRunDiagnostics aggregates timeout and retry counts from scan_diagnostics', () => {
  const diag = buildRunDiagnostics([
    { scan_status: 'success', scan_diagnostics: { timeout_count: 1, retry_count: 2 } },
    { scan_status: 'failed', scan_diagnostics: { timeout_count: 3, retry_count: 0 } }
  ]);

  assert.equal(diag.timeout_count, 4);
  assert.equal(diag.retry_count, 2);
});

test('buildRunDiagnostics handles missing scan_diagnostics gracefully', () => {
  const diag = buildRunDiagnostics([
    { scan_status: 'success' },
    { scan_status: 'failed', failure_reason: 'timeout' }
  ]);

  assert.equal(diag.timeout_count, 0);
  assert.equal(diag.retry_count, 0);
});

test('buildRunDiagnostics builds failure_reasons histogram', () => {
  const diag = buildRunDiagnostics([
    { scan_status: 'failed', failure_reason: 'lighthouse_error' },
    { scan_status: 'failed', failure_reason: 'lighthouse_error' },
    { scan_status: 'failed', failure_reason: 'timeout' },
    { scan_status: 'excluded', failure_reason: 'excluded_by_limit' }
  ]);

  assert.equal(diag.failure_reasons['lighthouse_error'], 2);
  assert.equal(diag.failure_reasons['timeout'], 1);
  assert.equal(diag.failure_reasons['excluded_by_limit'], 1);
});

test('buildRunDiagnostics does not add to failure_reasons for results without failure_reason', () => {
  const diag = buildRunDiagnostics([
    { scan_status: 'success' },
    { scan_status: 'success' }
  ]);

  assert.deepEqual(diag.failure_reasons, {});
});

test('buildRunDiagnostics total_urls equals length of input array', () => {
  const results = Array.from({ length: 7 }, () => ({ scan_status: 'success' }));
  const diag = buildRunDiagnostics(results);

  assert.equal(diag.total_urls, 7);
});
