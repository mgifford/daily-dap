import test from 'node:test';
import assert from 'node:assert/strict';
import { isSlowRiskStatus, annotateSlowRisk, buildSlowRiskRollup } from '../../src/aggregation/slow-risk.js';

// isSlowRiskStatus
test('isSlowRiskStatus returns true for "poor"', () => {
  assert.equal(isSlowRiskStatus('poor'), true);
});

test('isSlowRiskStatus returns false for "good"', () => {
  assert.equal(isSlowRiskStatus('good'), false);
});

test('isSlowRiskStatus returns false for "needs-improvement"', () => {
  assert.equal(isSlowRiskStatus('needs-improvement'), false);
});

test('isSlowRiskStatus returns false for undefined', () => {
  assert.equal(isSlowRiskStatus(undefined), false);
});

test('isSlowRiskStatus returns false for null', () => {
  assert.equal(isSlowRiskStatus(null), false);
});

test('isSlowRiskStatus returns false for empty string', () => {
  assert.equal(isSlowRiskStatus(''), false);
});

// annotateSlowRisk
test('annotateSlowRisk sets slow_risk true when core_web_vitals_status is "poor"', () => {
  const result = annotateSlowRisk({ url: 'https://example.gov/', core_web_vitals_status: 'poor' });
  assert.equal(result.slow_risk, true);
});

test('annotateSlowRisk sets slow_risk false when core_web_vitals_status is "good"', () => {
  const result = annotateSlowRisk({ url: 'https://example.gov/', core_web_vitals_status: 'good' });
  assert.equal(result.slow_risk, false);
});

test('annotateSlowRisk preserves all existing fields on the result object', () => {
  const input = { url: 'https://example.gov/', page_load_count: 1234, core_web_vitals_status: 'poor', scan_status: 'success' };
  const result = annotateSlowRisk(input);
  assert.equal(result.url, 'https://example.gov/');
  assert.equal(result.page_load_count, 1234);
  assert.equal(result.scan_status, 'success');
  assert.equal(result.slow_risk, true);
});

test('annotateSlowRisk does not mutate the original object', () => {
  const input = { url: 'https://example.gov/', core_web_vitals_status: 'poor' };
  annotateSlowRisk(input);
  assert.equal('slow_risk' in input, false);
});

test('annotateSlowRisk handles missing core_web_vitals_status (no property)', () => {
  const result = annotateSlowRisk({ url: 'https://example.gov/' });
  assert.equal(result.slow_risk, false);
});

test('annotateSlowRisk handles null input gracefully', () => {
  const result = annotateSlowRisk(null);
  assert.equal(result.slow_risk, false);
});

// buildSlowRiskRollup - edge cases beyond the one already in score-aggregation.test.js
test('buildSlowRiskRollup returns correct structure on empty input', () => {
  const rollup = buildSlowRiskRollup([]);
  assert.deepEqual(rollup.summary, {
    successful_url_count: 0,
    slow_risk_url_count: 0,
    successful_page_load_count: 0,
    slow_risk_page_load_count: 0,
    slow_risk_traffic_share_percent: 0
  });
  assert.deepEqual(rollup.annotated_results, []);
});

test('buildSlowRiskRollup handles no-arg call (default empty array)', () => {
  const rollup = buildSlowRiskRollup();
  assert.equal(rollup.summary.successful_url_count, 0);
  assert.equal(rollup.summary.slow_risk_traffic_share_percent, 0);
});

test('buildSlowRiskRollup excludes failed scan results from all counts', () => {
  const rollup = buildSlowRiskRollup([
    { scan_status: 'failed', page_load_count: 10000, core_web_vitals_status: 'poor' },
    { scan_status: 'excluded', page_load_count: 5000, core_web_vitals_status: 'poor' }
  ]);
  assert.equal(rollup.summary.successful_url_count, 0);
  assert.equal(rollup.summary.slow_risk_url_count, 0);
  assert.equal(rollup.summary.slow_risk_traffic_share_percent, 0);
});

test('buildSlowRiskRollup returns 0% share when no successful pages have traffic', () => {
  const rollup = buildSlowRiskRollup([
    { scan_status: 'success', page_load_count: 0, core_web_vitals_status: 'poor' }
  ]);
  assert.equal(rollup.summary.successful_url_count, 1);
  assert.equal(rollup.summary.slow_risk_url_count, 1);
  assert.equal(rollup.summary.successful_page_load_count, 0);
  assert.equal(rollup.summary.slow_risk_traffic_share_percent, 0);
});

test('buildSlowRiskRollup treats NaN page_load_count as 0', () => {
  const rollup = buildSlowRiskRollup([
    { scan_status: 'success', page_load_count: NaN, core_web_vitals_status: 'poor' }
  ]);
  assert.equal(rollup.summary.successful_page_load_count, 0);
  assert.equal(rollup.summary.slow_risk_page_load_count, 0);
  assert.equal(rollup.summary.slow_risk_traffic_share_percent, 0);
});

test('buildSlowRiskRollup treats negative page_load_count as 0', () => {
  const rollup = buildSlowRiskRollup([
    { scan_status: 'success', page_load_count: -500, core_web_vitals_status: 'poor' }
  ]);
  assert.equal(rollup.summary.successful_page_load_count, 0);
  assert.equal(rollup.summary.slow_risk_page_load_count, 0);
});

test('buildSlowRiskRollup treats non-number page_load_count as 0', () => {
  const rollup = buildSlowRiskRollup([
    { scan_status: 'success', page_load_count: 'not-a-number', core_web_vitals_status: 'poor' },
    { scan_status: 'success', page_load_count: 1000, core_web_vitals_status: 'good' }
  ]);
  assert.equal(rollup.summary.successful_page_load_count, 1000);
});

test('buildSlowRiskRollup rounds traffic share to two decimal places', () => {
  const rollup = buildSlowRiskRollup([
    { scan_status: 'success', page_load_count: 1000, core_web_vitals_status: 'poor' },
    { scan_status: 'success', page_load_count: 2000, core_web_vitals_status: 'good' }
  ]);
  // 1000 / 3000 = 33.333...% -> rounds to 33.33
  assert.equal(rollup.summary.slow_risk_traffic_share_percent, 33.33);
});

test('buildSlowRiskRollup returns 100% when all successful pages are poor', () => {
  const rollup = buildSlowRiskRollup([
    { scan_status: 'success', page_load_count: 500, core_web_vitals_status: 'poor' },
    { scan_status: 'success', page_load_count: 500, core_web_vitals_status: 'poor' }
  ]);
  assert.equal(rollup.summary.slow_risk_traffic_share_percent, 100);
});

test('buildSlowRiskRollup annotated_results contains all input items including failed', () => {
  const rollup = buildSlowRiskRollup([
    { scan_status: 'success', page_load_count: 100, core_web_vitals_status: 'good' },
    { scan_status: 'failed', page_load_count: 0, core_web_vitals_status: 'poor' }
  ]);
  assert.equal(rollup.annotated_results.length, 2);
});
