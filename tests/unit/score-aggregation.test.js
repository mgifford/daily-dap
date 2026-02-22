import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateCategoryScores } from '../../src/aggregation/score-aggregation.js';
import { buildSlowRiskRollup } from '../../src/aggregation/slow-risk.js';

test('aggregateCategoryScores excludes failed and excluded rows from means', () => {
  const summary = aggregateCategoryScores([
    {
      scan_status: 'success',
      lighthouse_performance: 80,
      lighthouse_accessibility: 90,
      lighthouse_best_practices: 70,
      lighthouse_seo: 60,
      lighthouse_pwa: 50
    },
    {
      scan_status: 'success',
      lighthouse_performance: 100,
      lighthouse_accessibility: 80,
      lighthouse_best_practices: 90,
      lighthouse_seo: 70,
      lighthouse_pwa: 30
    },
    {
      scan_status: 'failed',
      lighthouse_performance: 5,
      lighthouse_accessibility: 5,
      lighthouse_best_practices: 5,
      lighthouse_seo: 5,
      lighthouse_pwa: 5
    },
    {
      scan_status: 'excluded',
      lighthouse_performance: 10,
      lighthouse_accessibility: 10,
      lighthouse_best_practices: 10,
      lighthouse_seo: 10,
      lighthouse_pwa: 10
    }
  ]);

  assert.equal(summary.total_url_count, 4);
  assert.equal(summary.included_url_count, 2);
  assert.equal(summary.excluded_url_count, 2);
  assert.equal(summary.aggregate_scores.performance.mean_score, 90);
  assert.equal(summary.aggregate_scores.accessibility.mean_score, 85);
  assert.equal(summary.aggregate_scores.best_practices.mean_score, 80);
  assert.equal(summary.aggregate_scores.seo.mean_score, 65);
  assert.equal(summary.aggregate_scores.pwa.mean_score, 40);
  assert.equal(summary.aggregate_scores.performance.url_count_used, 2);
});

test('buildSlowRiskRollup maps poor CWV to slow_risk and computes traffic share', () => {
  const rollup = buildSlowRiskRollup([
    { scan_status: 'success', page_load_count: 1000, core_web_vitals_status: 'poor' },
    { scan_status: 'success', page_load_count: 500, core_web_vitals_status: 'good' },
    { scan_status: 'failed', page_load_count: 900, core_web_vitals_status: 'poor' }
  ]);

  assert.equal(rollup.summary.successful_url_count, 2);
  assert.equal(rollup.summary.slow_risk_url_count, 1);
  assert.equal(rollup.summary.successful_page_load_count, 1500);
  assert.equal(rollup.summary.slow_risk_page_load_count, 1000);
  assert.equal(rollup.summary.slow_risk_traffic_share_percent, 66.67);
  assert.equal(rollup.annotated_results[0].slow_risk, true);
  assert.equal(rollup.annotated_results[1].slow_risk, false);
});
