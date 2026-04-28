import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUrlScanResult } from '../../src/scanners/result-normalizer.js';

const BASE_URL_RECORD = {
  url: 'https://example.gov/page',
  page_load_count: 50000,
  source_date: '2024-11-15'
};

test('normalizeUrlScanResult returns object with expected top-level fields', () => {
  const result = normalizeUrlScanResult({
    runId: 'run-2024-11-15-abc123',
    urlRecord: BASE_URL_RECORD
  });

  assert.ok('run_id' in result);
  assert.ok('url' in result);
  assert.ok('page_load_count' in result);
  assert.ok('source_date' in result);
  assert.ok('scan_status' in result);
  assert.ok('failure_reason' in result);
  assert.ok('scan_diagnostics' in result);
  assert.ok('accessibility_findings' in result);
  assert.ok('axe_findings' in result);
});

test('normalizeUrlScanResult maps run_id and url from inputs', () => {
  const result = normalizeUrlScanResult({
    runId: 'run-2024-11-15-abc123',
    urlRecord: BASE_URL_RECORD
  });

  assert.equal(result.run_id, 'run-2024-11-15-abc123');
  assert.equal(result.url, 'https://example.gov/page');
  assert.equal(result.page_load_count, 50000);
  assert.equal(result.source_date, '2024-11-15');
});

test('normalizeUrlScanResult defaults to success status with no errors', () => {
  const result = normalizeUrlScanResult({
    runId: 'run-2024-11-15-abc123',
    urlRecord: BASE_URL_RECORD
  });

  assert.equal(result.scan_status, 'success');
  assert.equal(result.failure_reason, null);
});

test('normalizeUrlScanResult returns excluded status for excludedReason', () => {
  const result = normalizeUrlScanResult({
    runId: 'run-2024-11-15-abc123',
    urlRecord: BASE_URL_RECORD,
    excludedReason: 'excluded_by_limit'
  });

  assert.equal(result.scan_status, 'excluded');
  assert.equal(result.failure_reason, 'excluded_by_limit');
});

test('normalizeUrlScanResult returns failed status for failureReason', () => {
  const result = normalizeUrlScanResult({
    runId: 'run-2024-11-15-abc123',
    urlRecord: BASE_URL_RECORD,
    failureReason: 'timeout'
  });

  assert.equal(result.scan_status, 'failed');
  assert.equal(result.failure_reason, 'timeout');
});

test('normalizeUrlScanResult maps Lighthouse scores from lighthouseResult', () => {
  const lighthouseResult = {
    lighthouse_performance: 72,
    lighthouse_accessibility: 88,
    lighthouse_best_practices: 95,
    lighthouse_seo: 80,
    lighthouse_pwa: 0,
    core_web_vitals_status: 'good',
    lcp_value_ms: 1800,
    total_byte_weight: 800000
  };

  const result = normalizeUrlScanResult({
    runId: 'run-2024-11-15-abc123',
    urlRecord: BASE_URL_RECORD,
    lighthouseResult
  });

  assert.equal(result.lighthouse_performance, 72);
  assert.equal(result.lighthouse_accessibility, 88);
  assert.equal(result.lighthouse_best_practices, 95);
  assert.equal(result.lighthouse_seo, 80);
  assert.equal(result.lighthouse_pwa, 0);
  assert.equal(result.core_web_vitals_status, 'good');
  assert.equal(result.lcp_value_ms, 1800);
  assert.equal(result.total_byte_weight, 800000);
});

test('normalizeUrlScanResult defaults Lighthouse fields to null when no lighthouseResult', () => {
  const result = normalizeUrlScanResult({
    runId: 'run-2024-11-15-abc123',
    urlRecord: BASE_URL_RECORD
  });

  assert.equal(result.lighthouse_performance, null);
  assert.equal(result.lighthouse_accessibility, null);
  assert.equal(result.lcp_value_ms, null);
  assert.equal(result.total_byte_weight, null);
  assert.equal(result.core_web_vitals_status, 'unknown');
});

test('normalizeUrlScanResult maps ScanGov accessibility_findings', () => {
  const scanGovResult = {
    accessibility_findings: [
      { url: 'https://example.gov/page', issue_code: 'color-contrast', severity: 'serious', source_tool: 'scangov' }
    ]
  };

  const result = normalizeUrlScanResult({
    runId: 'run-2024-11-15-abc123',
    urlRecord: BASE_URL_RECORD,
    scanGovResult
  });

  assert.equal(result.accessibility_findings.length, 1);
  assert.equal(result.accessibility_findings[0].issue_code, 'color-contrast');
});

test('normalizeUrlScanResult returns empty accessibility_findings when no scanGovResult', () => {
  const result = normalizeUrlScanResult({
    runId: 'run-2024-11-15-abc123',
    urlRecord: BASE_URL_RECORD
  });

  assert.deepEqual(result.accessibility_findings, []);
});

test('normalizeUrlScanResult returns empty axe_findings when lighthouseResult has no raw', () => {
  const result = normalizeUrlScanResult({
    runId: 'run-2024-11-15-abc123',
    urlRecord: BASE_URL_RECORD,
    lighthouseResult: { lighthouse_performance: 80 }
  });

  assert.deepEqual(result.axe_findings, []);
});

test('normalizeUrlScanResult populates scan_diagnostics from diagnostics input', () => {
  const result = normalizeUrlScanResult({
    runId: 'run-2024-11-15-abc123',
    urlRecord: BASE_URL_RECORD,
    diagnostics: { attempt_count: 2, retry_count: 1, timeout_count: 1 }
  });

  assert.equal(result.scan_diagnostics.attempt_count, 2);
  assert.equal(result.scan_diagnostics.retry_count, 1);
  assert.equal(result.scan_diagnostics.timeout_count, 1);
});

test('normalizeUrlScanResult defaults scan_diagnostics to zeros when not provided', () => {
  const result = normalizeUrlScanResult({
    runId: 'run-2024-11-15-abc123',
    urlRecord: BASE_URL_RECORD
  });

  assert.equal(result.scan_diagnostics.attempt_count, 0);
  assert.equal(result.scan_diagnostics.retry_count, 0);
  assert.equal(result.scan_diagnostics.timeout_count, 0);
});

test('normalizeUrlScanResult returns null readability_metrics when no readabilityResult', () => {
  const result = normalizeUrlScanResult({
    runId: 'run-2024-11-15-abc123',
    urlRecord: BASE_URL_RECORD
  });

  assert.equal(result.readability_metrics, null);
});

test('normalizeUrlScanResult populates readability_metrics when provided', () => {
  const result = normalizeUrlScanResult({
    runId: 'run-2024-11-15-abc123',
    urlRecord: BASE_URL_RECORD,
    readabilityResult: { word_count: 500, char_count: 3000 },
    lighthouseResult: { total_byte_weight: 500000 }
  });

  assert.ok(result.readability_metrics !== null);
  assert.equal(result.readability_metrics.word_count, 500);
  assert.equal(result.readability_metrics.char_count, 3000);
});

test('normalizeUrlScanResult page_load_count is null when absent from urlRecord', () => {
  const result = normalizeUrlScanResult({
    runId: 'run-2024-11-15-abc123',
    urlRecord: { url: 'https://example.gov/' }
  });

  assert.equal(result.page_load_count, null);
  assert.equal(result.source_date, null);
});

test('normalizeUrlScanResult marks as failed when all primary Lighthouse scores are 0', () => {
  const lighthouseResult = {
    lighthouse_performance: 0,
    lighthouse_accessibility: 0,
    lighthouse_best_practices: 0,
    lighthouse_seo: 0,
    lighthouse_pwa: 0
  };

  const result = normalizeUrlScanResult({
    runId: 'run-2024-11-15-abc123',
    urlRecord: BASE_URL_RECORD,
    lighthouseResult
  });

  assert.equal(result.scan_status, 'failed');
  assert.equal(result.failure_reason, 'all_scores_zero');
});

test('normalizeUrlScanResult marks as failed when all primary Lighthouse scores are null', () => {
  const lighthouseResult = {
    lighthouse_performance: null,
    lighthouse_accessibility: null,
    lighthouse_best_practices: null,
    lighthouse_seo: null,
    lighthouse_pwa: 0
  };

  const result = normalizeUrlScanResult({
    runId: 'run-2024-11-15-abc123',
    urlRecord: BASE_URL_RECORD,
    lighthouseResult
  });

  assert.equal(result.scan_status, 'failed');
  assert.equal(result.failure_reason, 'all_scores_zero');
});

test('normalizeUrlScanResult stays success when at least one primary score is non-zero', () => {
  const lighthouseResult = {
    lighthouse_performance: 0,
    lighthouse_accessibility: 72,
    lighthouse_best_practices: 0,
    lighthouse_seo: 0,
    lighthouse_pwa: 0
  };

  const result = normalizeUrlScanResult({
    runId: 'run-2024-11-15-abc123',
    urlRecord: BASE_URL_RECORD,
    lighthouseResult
  });

  assert.equal(result.scan_status, 'success');
  assert.equal(result.failure_reason, null);
});

test('normalizeUrlScanResult does not apply zero-score check when no lighthouseResult', () => {
  const result = normalizeUrlScanResult({
    runId: 'run-2024-11-15-abc123',
    urlRecord: BASE_URL_RECORD
  });

  assert.equal(result.scan_status, 'success');
  assert.equal(result.failure_reason, null);
});

test('normalizeUrlScanResult zero-score check does not override existing failureReason', () => {
  const lighthouseResult = {
    lighthouse_performance: 0,
    lighthouse_accessibility: 0,
    lighthouse_best_practices: 0,
    lighthouse_seo: 0
  };

  const result = normalizeUrlScanResult({
    runId: 'run-2024-11-15-abc123',
    urlRecord: BASE_URL_RECORD,
    lighthouseResult,
    failureReason: 'timeout'
  });

  assert.equal(result.scan_status, 'failed');
  assert.equal(result.failure_reason, 'timeout');
});
