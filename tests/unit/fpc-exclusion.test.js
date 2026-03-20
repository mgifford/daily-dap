import test from 'node:test';
import assert from 'node:assert/strict';
import { computeFpcExclusion } from '../../src/aggregation/fpc-exclusion.js';
import { isCensusDataStale, getFpcPrevalenceRates, CENSUS_DISABILITY_STATS } from '../../src/data/census-disability-stats.js';

// Minimal census stub for deterministic tests
const TEST_CENSUS = {
  vintage_year: 2022,
  next_review_date: '2099-01-01',
  source: 'Test Source',
  source_url: 'https://example.gov',
  us_population: 335_000_000,
  fpc_rates: {
    WV: { rate: 0.01, estimated_population: 3_000_000, source_note: 'test' },
    LV: { rate: 0.02, estimated_population: 6_000_000, source_note: 'test' },
    WPC: { rate: 0.04, estimated_population: 13_000_000, source_note: 'test' },
    WH: { rate: 0.003, estimated_population: 1_000_000, source_note: 'test' },
    LH: { rate: 0.035, estimated_population: 11_000_000, source_note: 'test' },
    WS: { rate: 0.005, estimated_population: 1_500_000, source_note: 'test' },
    LM: { rate: 0.022, estimated_population: 7_000_000, source_note: 'test' },
    LRS: { rate: 0.058, estimated_population: 19_000_000, source_note: 'test' },
    LLCLA: { rate: 0.047, estimated_population: 15_000_000, source_note: 'test' }
  }
};

test('computeFpcExclusion returns zero excluded users when no findings', () => {
  const results = [
    {
      scan_status: 'success',
      url: 'https://example.gov/a',
      page_load_count: 1000,
      accessibility_findings: []
    }
  ];

  const exclusion = computeFpcExclusion(results, TEST_CENSUS);

  assert.equal(exclusion.total_page_loads, 1000);
  assert.equal(exclusion.scanned_url_count, 1);

  // All categories should have zero affected loads and zero excluded users
  for (const [, data] of Object.entries(exclusion.categories)) {
    assert.equal(data.affected_page_loads, 0);
    assert.equal(data.estimated_excluded_users, 0);
  }
});

test('computeFpcExclusion maps color-contrast findings to LV and WPC categories', () => {
  // 'color-contrast' maps to ['LV', 'WPC'] in AXE_TO_FPC
  const results = [
    {
      scan_status: 'success',
      url: 'https://example.gov/b',
      page_load_count: 2000,
      accessibility_findings: [
        { rule_id: 'color-contrast', severity: 'serious' }
      ]
    }
  ];

  const exclusion = computeFpcExclusion(results, TEST_CENSUS);

  assert.equal(exclusion.total_page_loads, 2000);

  // LV: rate=0.02, affected_loads=2000 -> 40 excluded
  assert.equal(exclusion.categories.LV.affected_page_loads, 2000);
  assert.equal(exclusion.categories.LV.estimated_excluded_users, 40);

  // WPC: rate=0.04, affected_loads=2000 -> 80 excluded
  assert.equal(exclusion.categories.WPC.affected_page_loads, 2000);
  assert.equal(exclusion.categories.WPC.estimated_excluded_users, 80);

  // WV should NOT be affected (color-contrast doesn't map to WV)
  assert.equal(exclusion.categories.WV.affected_page_loads, 0);
  assert.equal(exclusion.categories.WV.estimated_excluded_users, 0);
});

test('computeFpcExclusion aggregates page loads across multiple affected URLs', () => {
  // 'image-alt' maps to ['WV', 'WH']
  const results = [
    {
      scan_status: 'success',
      url: 'https://example.gov/c',
      page_load_count: 500,
      accessibility_findings: [{ rule_id: 'image-alt', severity: 'critical' }]
    },
    {
      scan_status: 'success',
      url: 'https://example.gov/d',
      page_load_count: 1500,
      accessibility_findings: [{ rule_id: 'image-alt', severity: 'serious' }]
    }
  ];

  const exclusion = computeFpcExclusion(results, TEST_CENSUS);

  assert.equal(exclusion.total_page_loads, 2000);

  // WV: rate=0.01, affected_loads = 500 + 1500 = 2000 -> 20 excluded
  assert.equal(exclusion.categories.WV.affected_page_loads, 2000);
  assert.equal(exclusion.categories.WV.estimated_excluded_users, 20);

  // WH: rate=0.003, affected_loads = 2000 -> 6 excluded
  assert.equal(exclusion.categories.WH.affected_page_loads, 2000);
  assert.equal(exclusion.categories.WH.estimated_excluded_users, 6);
});

test('computeFpcExclusion ignores failed and excluded scan results', () => {
  const results = [
    {
      scan_status: 'success',
      url: 'https://example.gov/ok',
      page_load_count: 1000,
      accessibility_findings: [{ rule_id: 'image-alt', severity: 'critical' }]
    },
    {
      scan_status: 'failed',
      url: 'https://example.gov/fail',
      page_load_count: 5000,
      accessibility_findings: [{ rule_id: 'image-alt', severity: 'critical' }]
    },
    {
      scan_status: 'excluded',
      url: 'https://example.gov/skip',
      page_load_count: 3000,
      accessibility_findings: [{ rule_id: 'image-alt', severity: 'critical' }]
    }
  ];

  const exclusion = computeFpcExclusion(results, TEST_CENSUS);

  // Only the successful result should count
  assert.equal(exclusion.scanned_url_count, 1);
  assert.equal(exclusion.total_page_loads, 1000);
  assert.equal(exclusion.categories.WV.affected_page_loads, 1000);
});

test('computeFpcExclusion uses rule_id field from findings', () => {
  const results = [
    {
      scan_status: 'success',
      url: 'https://example.gov/e',
      page_load_count: 800,
      accessibility_findings: [
        { rule_id: 'link-name', severity: 'serious' } // maps to WV, WH, LM
      ]
    }
  ];

  const exclusion = computeFpcExclusion(results, TEST_CENSUS);

  assert.equal(exclusion.categories.WV.affected_page_loads, 800);
  assert.equal(exclusion.categories.WH.affected_page_loads, 800);
  assert.equal(exclusion.categories.LM.affected_page_loads, 800);
  // LV should not be affected (link-name doesn't map to LV)
  assert.equal(exclusion.categories.LV.affected_page_loads, 0);
});

test('computeFpcExclusion returns census metadata in output', () => {
  const exclusion = computeFpcExclusion([], TEST_CENSUS);

  assert.equal(exclusion.census_vintage_year, 2022);
  assert.equal(exclusion.census_source, 'Test Source');
  assert.equal(exclusion.census_source_url, 'https://example.gov');
});

test('computeFpcExclusion handles empty results array', () => {
  const exclusion = computeFpcExclusion([], TEST_CENSUS);

  assert.equal(exclusion.total_page_loads, 0);
  assert.equal(exclusion.scanned_url_count, 0);
  for (const [, data] of Object.entries(exclusion.categories)) {
    assert.equal(data.estimated_excluded_users, 0);
  }
});

test('computeFpcExclusion uses CENSUS_DISABILITY_STATS by default', () => {
  const results = [
    {
      scan_status: 'success',
      url: 'https://example.gov/default',
      page_load_count: 100,
      accessibility_findings: []
    }
  ];

  // Should not throw when no census stats override is provided
  const exclusion = computeFpcExclusion(results);

  assert.equal(exclusion.census_vintage_year, CENSUS_DISABILITY_STATS.vintage_year);
  assert.ok(typeof exclusion.total_page_loads === 'number');
});

test('computeFpcExclusion uses axe_findings (id field) when accessibility_findings is absent', () => {
  // axe_findings use 'id' rather than 'rule_id'; color-contrast maps to LV and WPC
  const results = [
    {
      scan_status: 'success',
      url: 'https://example.gov/axe',
      page_load_count: 3000,
      axe_findings: [
        { id: 'color-contrast', impact: 'serious', title: 'Elements must meet minimum color contrast' }
      ]
    }
  ];

  const exclusion = computeFpcExclusion(results, TEST_CENSUS);

  assert.equal(exclusion.total_page_loads, 3000);
  assert.equal(exclusion.categories.LV.affected_page_loads, 3000);
  assert.equal(exclusion.categories.WPC.affected_page_loads, 3000);
  assert.equal(exclusion.categories.WV.affected_page_loads, 0);
});

test('computeFpcExclusion prefers axe_findings over accessibility_findings when both present', () => {
  // axe_findings has image-alt (maps to WV, WH); accessibility_findings has color-contrast
  // (maps to LV, WPC). The axe_findings result should win.
  const results = [
    {
      scan_status: 'success',
      url: 'https://example.gov/both',
      page_load_count: 1000,
      axe_findings: [{ id: 'image-alt', impact: 'critical' }],
      accessibility_findings: [{ rule_id: 'color-contrast', severity: 'serious' }]
    }
  ];

  const exclusion = computeFpcExclusion(results, TEST_CENSUS);

  // axe_findings wins: image-alt affects WV and WH
  assert.equal(exclusion.categories.WV.affected_page_loads, 1000);
  assert.equal(exclusion.categories.WH.affected_page_loads, 1000);
  // LV/WPC should NOT be affected (color-contrast came from accessibility_findings, not used)
  assert.equal(exclusion.categories.LV.affected_page_loads, 0);
  assert.equal(exclusion.categories.WPC.affected_page_loads, 0);
});

test('computeFpcExclusion falls back to accessibility_findings when axe_findings is empty', () => {
  const results = [
    {
      scan_status: 'success',
      url: 'https://example.gov/fallback',
      page_load_count: 500,
      axe_findings: [],
      accessibility_findings: [{ rule_id: 'color-contrast', severity: 'serious' }]
    }
  ];

  const exclusion = computeFpcExclusion(results, TEST_CENSUS);

  assert.equal(exclusion.categories.LV.affected_page_loads, 500);
  assert.equal(exclusion.categories.WPC.affected_page_loads, 500);
  assert.equal(exclusion.categories.WV.affected_page_loads, 0);
});

test('isCensusDataStale returns false for future review date', () => {
  assert.equal(isCensusDataStale('2025-01-01'), false);
});

test('isCensusDataStale returns true for past review date', () => {
  assert.equal(isCensusDataStale('2099-12-31'), true);
});

test('getFpcPrevalenceRates returns a plain object of FPC rates', () => {
  const rates = getFpcPrevalenceRates();

  assert.equal(typeof rates, 'object');
  assert.ok('WV' in rates);
  assert.ok('LV' in rates);
  assert.ok('LLCLA' in rates);

  // All values should be numbers between 0 and 1
  for (const [, rate] of Object.entries(rates)) {
    assert.equal(typeof rate, 'number');
    assert.ok(rate > 0 && rate < 1, `Rate ${rate} should be between 0 and 1`);
  }
});
