import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateCategoryImpact } from '../../src/aggregation/prevalence-impact.js';

const SAMPLE_RATES = {
  WV: 0.010,
  LV: 0.024,
  WH: 0.003
};

test('estimateCategoryImpact returns expected category keys matching prevalenceRates', () => {
  const result = estimateCategoryImpact(
    { totals: { weighted_affected_traffic: 10000, total_page_load_count: 100000 } },
    SAMPLE_RATES
  );

  assert.ok('WV' in result.categories);
  assert.ok('LV' in result.categories);
  assert.ok('WH' in result.categories);
});

test('estimateCategoryImpact calculates estimated_impacted_users correctly', () => {
  // WV: 10000 * 0.010 = 100
  const result = estimateCategoryImpact(
    { totals: { weighted_affected_traffic: 10000, total_page_load_count: 100000 } },
    { WV: 0.010 }
  );

  assert.equal(result.categories.WV.estimated_impacted_users, 100);
});

test('estimateCategoryImpact calculates estimated_impacted_share_percent correctly', () => {
  // share = (100 / 100000) * 100 = 0.1%
  const result = estimateCategoryImpact(
    { totals: { weighted_affected_traffic: 10000, total_page_load_count: 100000 } },
    { WV: 0.010 }
  );

  assert.equal(result.categories.WV.estimated_impacted_share_percent, 0.1);
});

test('estimateCategoryImpact rounds results to two decimal places', () => {
  // 10000 * 0.033 = 330.00 (exact)
  // 10000 * 0.031 = 310 -> share = 310/100000 * 100 = 0.31
  const result = estimateCategoryImpact(
    { totals: { weighted_affected_traffic: 10000, total_page_load_count: 100000 } },
    { X: 0.031 }
  );

  // Verify it's rounded to 2dp (not more)
  const users = result.categories.X.estimated_impacted_users;
  assert.equal(users, Math.round(users * 100) / 100);
});

test('estimateCategoryImpact returns zero share when total_page_load_count is 0', () => {
  const result = estimateCategoryImpact(
    { totals: { weighted_affected_traffic: 5000, total_page_load_count: 0 } },
    { WV: 0.010 }
  );

  assert.equal(result.categories.WV.estimated_impacted_share_percent, 0);
});

test('estimateCategoryImpact returns zero values when weighted_affected_traffic is 0', () => {
  const result = estimateCategoryImpact(
    { totals: { weighted_affected_traffic: 0, total_page_load_count: 100000 } },
    SAMPLE_RATES
  );

  for (const cat of Object.values(result.categories)) {
    assert.equal(cat.estimated_impacted_users, 0);
    assert.equal(cat.estimated_impacted_share_percent, 0);
  }
});

test('estimateCategoryImpact returns zero totals when weightedImpact is null', () => {
  const result = estimateCategoryImpact(null, SAMPLE_RATES);

  assert.equal(result.weighted_affected_traffic, 0);
  assert.equal(result.total_page_load_count, 0);
});

test('estimateCategoryImpact returns empty categories when prevalenceRates is empty', () => {
  const result = estimateCategoryImpact(
    { totals: { weighted_affected_traffic: 10000, total_page_load_count: 100000 } },
    {}
  );

  assert.deepEqual(result.categories, {});
});

test('estimateCategoryImpact returns correct weighted_affected_traffic and total_page_load_count', () => {
  const result = estimateCategoryImpact(
    { totals: { weighted_affected_traffic: 5000, total_page_load_count: 50000 } },
    SAMPLE_RATES
  );

  assert.equal(result.weighted_affected_traffic, 5000);
  assert.equal(result.total_page_load_count, 50000);
});

test('estimateCategoryImpact preserves prevalence_rate in each category', () => {
  const result = estimateCategoryImpact(
    { totals: { weighted_affected_traffic: 10000, total_page_load_count: 100000 } },
    { WV: 0.010, LH: 0.035 }
  );

  assert.equal(result.categories.WV.prevalence_rate, 0.010);
  assert.equal(result.categories.LH.prevalence_rate, 0.035);
});
