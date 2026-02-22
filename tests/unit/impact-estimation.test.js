import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateWeightedImpact } from '../../src/aggregation/impact-estimation.js';
import { estimateCategoryImpact } from '../../src/aggregation/prevalence-impact.js';

const config = {
  scan: {
    traffic_window_mode: 'daily'
  },
  impact: {
    severity_weights: {
      critical: 1,
      serious: 0.6,
      moderate: 0.3,
      minor: 0.1
    },
    fallback_severity_weight: 0.2,
    prevalence_rates: {
      blindness: 0.01,
      low_vision: 0.2
    }
  }
};

test('estimateWeightedImpact applies clarified severity weights with fallback', () => {
  const weighted = estimateWeightedImpact(
    [
      {
        scan_status: 'success',
        url: 'https://example.gov/a',
        page_load_count: 1000,
        accessibility_findings: [{ severity: 'critical' }, { severity: 'moderate' }, { severity: 'unknown' }]
      },
      {
        scan_status: 'success',
        url: 'https://example.gov/b',
        page_load_count: 500,
        accessibility_findings: [{ severity: 'minor' }, { severity: 'serious' }]
      },
      {
        scan_status: 'failed',
        url: 'https://example.gov/c',
        page_load_count: 2000,
        accessibility_findings: [{ severity: 'critical' }]
      }
    ],
    config
  );

  assert.equal(weighted.totals.included_url_count, 2);
  assert.equal(weighted.totals.total_page_load_count, 1500);
  assert.equal(weighted.url_impacts[0].weighted_issue_sum, 1.5);
  assert.equal(weighted.url_impacts[0].normalized_issue_signal, 0.5);
  assert.equal(weighted.url_impacts[0].weighted_affected_traffic, 500);
  assert.equal(weighted.url_impacts[1].weighted_issue_sum, 0.7);
  assert.equal(weighted.url_impacts[1].weighted_affected_traffic, 175);
  assert.equal(weighted.totals.weighted_affected_traffic, 675);
  assert.equal(weighted.totals.affected_share_percent, 45);
});

test('estimateWeightedImpact supports traffic window variants', () => {
  const weighted = estimateWeightedImpact(
    [
      {
        scan_status: 'success',
        url: 'https://example.gov/window',
        page_load_by_window: {
          daily: 100,
          rolling_7d: 700,
          rolling_30d: 3000
        },
        accessibility_findings: [{ severity: 'critical' }]
      }
    ],
    config,
    { trafficWindowMode: 'rolling_7d' }
  );

  assert.equal(weighted.traffic_window_mode, 'rolling_7d');
  assert.equal(weighted.totals.total_page_load_count, 700);
  assert.equal(weighted.totals.weighted_affected_traffic, 700);
});

test('estimateCategoryImpact applies prevalence profile per category', () => {
  const weighted = estimateWeightedImpact(
    [
      {
        scan_status: 'success',
        url: 'https://example.gov/prevalence',
        page_load_count: 1000,
        accessibility_findings: [{ severity: 'critical' }]
      }
    ],
    config
  );

  const categoryImpact = estimateCategoryImpact(weighted, config.impact.prevalence_rates);

  assert.equal(categoryImpact.weighted_affected_traffic, 1000);
  assert.equal(categoryImpact.categories.blindness.estimated_impacted_users, 10);
  assert.equal(categoryImpact.categories.blindness.estimated_impacted_share_percent, 1);
  assert.equal(categoryImpact.categories.low_vision.estimated_impacted_users, 200);
  assert.equal(categoryImpact.categories.low_vision.estimated_impacted_share_percent, 20);
});
