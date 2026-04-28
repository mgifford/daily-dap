import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyScanStatus, FAILURE_REASON_CATALOG } from '../../src/scanners/status-classifier.js';

test('classifyScanStatus returns success when no errors or exclusions', () => {
  const result = classifyScanStatus({});
  assert.equal(result.scan_status, 'success');
  assert.equal(result.failure_reason, null);
});

test('classifyScanStatus returns success with no arguments', () => {
  const result = classifyScanStatus();
  assert.equal(result.scan_status, 'success');
  assert.equal(result.failure_reason, null);
});

test('classifyScanStatus returns excluded when excludedReason is set', () => {
  const result = classifyScanStatus({ excludedReason: FAILURE_REASON_CATALOG.EXCLUDED_BY_LIMIT });
  assert.equal(result.scan_status, 'excluded');
  assert.equal(result.failure_reason, FAILURE_REASON_CATALOG.EXCLUDED_BY_LIMIT);
});

test('classifyScanStatus returns excluded with custom excludedReason string', () => {
  const result = classifyScanStatus({ excludedReason: 'excluded_missing_url' });
  assert.equal(result.scan_status, 'excluded');
  assert.equal(result.failure_reason, 'excluded_missing_url');
});

test('classifyScanStatus returns failed when failureReason is set', () => {
  const result = classifyScanStatus({ failureReason: FAILURE_REASON_CATALOG.TIMEOUT });
  assert.equal(result.scan_status, 'failed');
  assert.equal(result.failure_reason, FAILURE_REASON_CATALOG.TIMEOUT);
});

test('classifyScanStatus returns failed with LIGHTHOUSE_ERROR for lighthouseError', () => {
  const result = classifyScanStatus({ lighthouseError: new Error('Chrome crashed') });
  assert.equal(result.scan_status, 'failed');
  assert.equal(result.failure_reason, FAILURE_REASON_CATALOG.LIGHTHOUSE_ERROR);
});

test('classifyScanStatus returns failed with SCANGOV_ERROR for scanGovError', () => {
  const result = classifyScanStatus({ scanGovError: new Error('API timeout') });
  assert.equal(result.scan_status, 'failed');
  assert.equal(result.failure_reason, FAILURE_REASON_CATALOG.SCANGOV_ERROR);
});

test('classifyScanStatus excludedReason takes priority over lighthouseError', () => {
  const result = classifyScanStatus({
    excludedReason: FAILURE_REASON_CATALOG.EXCLUDED_BY_LIMIT,
    lighthouseError: new Error('Chrome crashed')
  });
  assert.equal(result.scan_status, 'excluded');
  assert.equal(result.failure_reason, FAILURE_REASON_CATALOG.EXCLUDED_BY_LIMIT);
});

test('classifyScanStatus failureReason takes priority over lighthouseError', () => {
  const result = classifyScanStatus({
    failureReason: FAILURE_REASON_CATALOG.EXECUTION_ERROR,
    lighthouseError: new Error('Chrome crashed')
  });
  assert.equal(result.scan_status, 'failed');
  assert.equal(result.failure_reason, FAILURE_REASON_CATALOG.EXECUTION_ERROR);
});

test('classifyScanStatus lighthouseError takes priority over scanGovError', () => {
  const result = classifyScanStatus({
    lighthouseError: new Error('Chrome crashed'),
    scanGovError: new Error('API timeout')
  });
  assert.equal(result.scan_status, 'failed');
  assert.equal(result.failure_reason, FAILURE_REASON_CATALOG.LIGHTHOUSE_ERROR);
});

test('FAILURE_REASON_CATALOG is frozen and contains expected codes', () => {
  assert.ok(Object.isFrozen(FAILURE_REASON_CATALOG));
  assert.equal(FAILURE_REASON_CATALOG.TIMEOUT, 'timeout');
  assert.equal(FAILURE_REASON_CATALOG.LIGHTHOUSE_ERROR, 'lighthouse_error');
  assert.equal(FAILURE_REASON_CATALOG.SCANGOV_ERROR, 'scangov_error');
  assert.equal(FAILURE_REASON_CATALOG.EXECUTION_ERROR, 'execution_error');
  assert.equal(FAILURE_REASON_CATALOG.MALFORMED_OUTPUT, 'malformed_output');
  assert.equal(FAILURE_REASON_CATALOG.EXCLUDED_MISSING_URL, 'excluded_missing_url');
  assert.equal(FAILURE_REASON_CATALOG.EXCLUDED_BY_LIMIT, 'excluded_by_limit');
  assert.equal(FAILURE_REASON_CATALOG.ALL_SCORES_ZERO, 'all_scores_zero');
});
