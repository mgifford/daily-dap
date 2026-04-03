import test from 'node:test';
import assert from 'node:assert/strict';
import { CENSUS_DISABILITY_STATS, isCensusDataStale, getFpcPrevalenceRates } from '../../src/data/census-disability-stats.js';

test('isCensusDataStale returns false for a date before next_review_date', () => {
  assert.equal(isCensusDataStale('2025-01-01'), false);
});

test('isCensusDataStale returns true for a date equal to next_review_date', () => {
  assert.equal(isCensusDataStale('2027-01-01'), true);
});

test('isCensusDataStale returns true for a date after next_review_date', () => {
  assert.equal(isCensusDataStale('2028-06-15'), true);
});

test('getFpcPrevalenceRates returns an object keyed by FPC code', () => {
  const rates = getFpcPrevalenceRates();

  assert.ok(typeof rates === 'object' && rates !== null);
  assert.ok('WV' in rates);
  assert.ok('LV' in rates);
  assert.ok('WPC' in rates);
  assert.ok('WH' in rates);
  assert.ok('LH' in rates);
  assert.ok('WS' in rates);
  assert.ok('LM' in rates);
  assert.ok('LRS' in rates);
  assert.ok('LLCLA' in rates);
});

test('getFpcPrevalenceRates values are numbers between 0 and 1', () => {
  const rates = getFpcPrevalenceRates();

  for (const [code, rate] of Object.entries(rates)) {
    assert.ok(typeof rate === 'number', `${code} rate should be a number`);
    assert.ok(rate > 0 && rate < 1, `${code} rate ${rate} should be between 0 and 1`);
  }
});

test('getFpcPrevalenceRates WV rate matches CENSUS_DISABILITY_STATS', () => {
  const rates = getFpcPrevalenceRates();
  assert.equal(rates.WV, CENSUS_DISABILITY_STATS.fpc_rates.WV.rate);
});

test('CENSUS_DISABILITY_STATS has vintage_year, next_review_date, source, us_population', () => {
  assert.ok(typeof CENSUS_DISABILITY_STATS.vintage_year === 'number');
  assert.ok(typeof CENSUS_DISABILITY_STATS.next_review_date === 'string');
  assert.ok(typeof CENSUS_DISABILITY_STATS.source === 'string');
  assert.ok(typeof CENSUS_DISABILITY_STATS.us_population === 'number');
});

test('CENSUS_DISABILITY_STATS fpc_rates entries have rate and estimated_population', () => {
  for (const [code, data] of Object.entries(CENSUS_DISABILITY_STATS.fpc_rates)) {
    assert.ok(typeof data.rate === 'number', `${code}.rate should be a number`);
    assert.ok(typeof data.estimated_population === 'number', `${code}.estimated_population should be a number`);
  }
});

test('getFpcPrevalenceRates returns a plain object not referencing internal data', () => {
  const rates = getFpcPrevalenceRates();
  // Mutating the result should not affect CENSUS_DISABILITY_STATS
  rates.WV = 999;
  assert.equal(CENSUS_DISABILITY_STATS.fpc_rates.WV.rate, 0.010);
});
