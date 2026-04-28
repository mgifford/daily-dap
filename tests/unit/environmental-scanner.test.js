import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAqiAffected,
  isPollenAffected,
  getSeasonalPollenTypes,
  computeOverallLevel,
  parseAirNowObservations,
  parsePollenResponse,
  fetchAirNowForMetro,
  fetchPollenForMetro,
  fetchEnvironmentalConditions,
  AQI_AFFECTED_THRESHOLD,
  POLLEN_AFFECTED_CATEGORIES,
  METRO_LIST
} from '../../src/scanners/environmental-scanner.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

test('AQI_AFFECTED_THRESHOLD is 101', () => {
  assert.equal(AQI_AFFECTED_THRESHOLD, 101);
});

test('POLLEN_AFFECTED_CATEGORIES includes HIGH and VERY_HIGH', () => {
  assert.ok(POLLEN_AFFECTED_CATEGORIES.has('HIGH'));
  assert.ok(POLLEN_AFFECTED_CATEGORIES.has('VERY_HIGH'));
  assert.ok(!POLLEN_AFFECTED_CATEGORIES.has('MODERATE'));
  assert.ok(!POLLEN_AFFECTED_CATEGORIES.has('LOW'));
});

test('METRO_LIST contains all 41 required metros', () => {
  assert.equal(METRO_LIST.length, 41);
  const metroNames = METRO_LIST.map((m) => m.metro);
  assert.ok(metroNames.includes('New York'));
  assert.ok(metroNames.includes('Los Angeles'));
  assert.ok(metroNames.includes('Chicago'));
  assert.ok(metroNames.includes('Washington DC'));
  assert.ok(metroNames.includes('Kansas City'));
});

test('each metro in METRO_LIST has zip, lat, lon', () => {
  for (const metro of METRO_LIST) {
    assert.ok(typeof metro.zip === 'string' && metro.zip.length > 0, `${metro.metro} missing zip`);
    assert.ok(typeof metro.lat === 'number', `${metro.metro} missing lat`);
    assert.ok(typeof metro.lon === 'number', `${metro.metro} missing lon`);
  }
});

// ---------------------------------------------------------------------------
// isAqiAffected - AQI threshold classification
// ---------------------------------------------------------------------------

test('isAqiAffected returns false for AQI below threshold (100)', () => {
  assert.equal(isAqiAffected(100), false);
});

test('isAqiAffected returns false for AQI of 0', () => {
  assert.equal(isAqiAffected(0), false);
});

test('isAqiAffected returns true for AQI exactly at threshold (101)', () => {
  assert.equal(isAqiAffected(101), true);
});

test('isAqiAffected returns true for AQI above threshold (150)', () => {
  assert.equal(isAqiAffected(150), true);
});

test('isAqiAffected returns true for AQI of 300', () => {
  assert.equal(isAqiAffected(300), true);
});

test('isAqiAffected returns false for null', () => {
  assert.equal(isAqiAffected(null), false);
});

test('isAqiAffected returns false for undefined', () => {
  assert.equal(isAqiAffected(undefined), false);
});

test('isAqiAffected returns false for NaN', () => {
  assert.equal(isAqiAffected(NaN), false);
});

test('isAqiAffected returns false for non-numeric string', () => {
  assert.equal(isAqiAffected('150'), false);
});

// ---------------------------------------------------------------------------
// isPollenAffected - pollen HIGH / VERY_HIGH classification
// ---------------------------------------------------------------------------

test('isPollenAffected returns true for HIGH', () => {
  assert.equal(isPollenAffected('HIGH'), true);
});

test('isPollenAffected returns true for VERY_HIGH', () => {
  assert.equal(isPollenAffected('VERY_HIGH'), true);
});

test('isPollenAffected is case-insensitive (high)', () => {
  assert.equal(isPollenAffected('high'), true);
});

test('isPollenAffected is case-insensitive (very_high)', () => {
  assert.equal(isPollenAffected('very_high'), true);
});

test('isPollenAffected returns false for MODERATE', () => {
  assert.equal(isPollenAffected('MODERATE'), false);
});

test('isPollenAffected returns false for LOW', () => {
  assert.equal(isPollenAffected('LOW'), false);
});

test('isPollenAffected returns false for VERY_LOW', () => {
  assert.equal(isPollenAffected('VERY_LOW'), false);
});

test('isPollenAffected returns false for NONE', () => {
  assert.equal(isPollenAffected('NONE'), false);
});

test('isPollenAffected returns false for null', () => {
  assert.equal(isPollenAffected(null), false);
});

test('isPollenAffected returns false for undefined', () => {
  assert.equal(isPollenAffected(undefined), false);
});

// ---------------------------------------------------------------------------
// getSeasonalPollenTypes - seasonal fallback by month
// ---------------------------------------------------------------------------

test('getSeasonalPollenTypes returns TREE for March (month 3)', () => {
  const result = getSeasonalPollenTypes(3);
  const types = result.map((r) => r.type);
  assert.ok(types.includes('TREE'));
});

test('getSeasonalPollenTypes returns TREE and GRASS for May (month 5)', () => {
  const result = getSeasonalPollenTypes(5);
  const types = result.map((r) => r.type);
  assert.ok(types.includes('TREE'));
  assert.ok(types.includes('GRASS'));
});

test('getSeasonalPollenTypes returns TREE and GRASS for June (month 6)', () => {
  const result = getSeasonalPollenTypes(6);
  const types = result.map((r) => r.type);
  assert.ok(types.includes('TREE'));
  assert.ok(types.includes('GRASS'));
});

test('getSeasonalPollenTypes returns only GRASS for July (month 7)', () => {
  const result = getSeasonalPollenTypes(7);
  const types = result.map((r) => r.type);
  assert.ok(!types.includes('TREE'));
  assert.ok(types.includes('GRASS'));
  assert.ok(!types.includes('WEED'));
});

test('getSeasonalPollenTypes returns WEED for August (month 8)', () => {
  const result = getSeasonalPollenTypes(8);
  const types = result.map((r) => r.type);
  assert.ok(types.includes('WEED'));
  assert.ok(!types.includes('TREE'));
});

test('getSeasonalPollenTypes returns WEED for October (month 10)', () => {
  const result = getSeasonalPollenTypes(10);
  const types = result.map((r) => r.type);
  assert.ok(types.includes('WEED'));
});

test('getSeasonalPollenTypes returns empty for November (month 11)', () => {
  const result = getSeasonalPollenTypes(11);
  assert.equal(result.length, 0);
});

test('getSeasonalPollenTypes returns empty for December (month 12)', () => {
  const result = getSeasonalPollenTypes(12);
  assert.equal(result.length, 0);
});

test('getSeasonalPollenTypes returns empty for January (month 1)', () => {
  const result = getSeasonalPollenTypes(1);
  assert.equal(result.length, 0);
});

test('getSeasonalPollenTypes returns empty for February (month 2)', () => {
  const result = getSeasonalPollenTypes(2);
  assert.equal(result.length, 0);
});

test('getSeasonalPollenTypes marks all entries as seasonal dataType', () => {
  const result = getSeasonalPollenTypes(4);
  for (const entry of result) {
    assert.equal(entry.dataType, 'seasonal');
  }
});

// ---------------------------------------------------------------------------
// computeOverallLevel - overall level calculation
// ---------------------------------------------------------------------------

test('computeOverallLevel returns low for 0 signals', () => {
  assert.equal(computeOverallLevel(0), 'low');
});

test('computeOverallLevel returns low for 1 signal', () => {
  assert.equal(computeOverallLevel(1), 'low');
});

test('computeOverallLevel returns low for 2 signals', () => {
  assert.equal(computeOverallLevel(2), 'low');
});

test('computeOverallLevel returns moderate for 3 signals', () => {
  assert.equal(computeOverallLevel(3), 'moderate');
});

test('computeOverallLevel returns moderate for 5 signals', () => {
  assert.equal(computeOverallLevel(5), 'moderate');
});

test('computeOverallLevel returns high for 6 signals', () => {
  assert.equal(computeOverallLevel(6), 'high');
});

test('computeOverallLevel returns high for 100 signals', () => {
  assert.equal(computeOverallLevel(100), 'high');
});

// ---------------------------------------------------------------------------
// parseAirNowObservations
// ---------------------------------------------------------------------------

test('parseAirNowObservations returns null aqi for empty array', () => {
  const result = parseAirNowObservations([]);
  assert.equal(result.aqi, null);
  assert.equal(result.pm25Aqi, null);
});

test('parseAirNowObservations returns null for non-array', () => {
  const result = parseAirNowObservations(null);
  assert.equal(result.aqi, null);
  assert.equal(result.pm25Aqi, null);
});

test('parseAirNowObservations extracts max AQI from single observation', () => {
  const obs = [{ ParameterName: 'O3', AQI: 75, Category: { Number: 2, Name: 'Moderate' } }];
  const result = parseAirNowObservations(obs);
  assert.equal(result.aqi, 75);
  assert.equal(result.pm25Aqi, null);
});

test('parseAirNowObservations extracts PM2.5 AQI correctly', () => {
  const obs = [
    { ParameterName: 'O3', AQI: 45 },
    { ParameterName: 'PM2.5', AQI: 110 }
  ];
  const result = parseAirNowObservations(obs);
  assert.equal(result.aqi, 110);
  assert.equal(result.pm25Aqi, 110);
});

test('parseAirNowObservations returns max AQI across all parameters', () => {
  const obs = [
    { ParameterName: 'O3', AQI: 120 },
    { ParameterName: 'PM2.5', AQI: 90 }
  ];
  const result = parseAirNowObservations(obs);
  assert.equal(result.aqi, 120);
  assert.equal(result.pm25Aqi, 90);
});

test('parseAirNowObservations handles PM2.5 proxy - identifies particle pollution', () => {
  const obs = [
    { ParameterName: 'PM2.5', AQI: 155 }
  ];
  const result = parseAirNowObservations(obs);
  assert.ok(isAqiAffected(result.pm25Aqi), 'PM2.5 AQI >= 101 should be flagged as affected');
});

// ---------------------------------------------------------------------------
// parsePollenResponse
// ---------------------------------------------------------------------------

test('parsePollenResponse returns empty array for null', () => {
  assert.deepEqual(parsePollenResponse(null), []);
});

test('parsePollenResponse returns empty array for empty response', () => {
  assert.deepEqual(parsePollenResponse({}), []);
});

test('parsePollenResponse returns empty array for missing dailyInfo', () => {
  assert.deepEqual(parsePollenResponse({ dailyInfo: [] }), []);
});

test('parsePollenResponse extracts pollen type info correctly', () => {
  const response = {
    dailyInfo: [{
      date: { year: 2024, month: 5, day: 15 },
      pollenTypeInfo: [
        {
          code: 'TREE',
          displayName: 'Tree',
          inSeason: true,
          indexInfo: { code: 'HIGH', displayName: 'High', value: 4 }
        },
        {
          code: 'GRASS',
          displayName: 'Grass',
          inSeason: true,
          indexInfo: { code: 'MODERATE', displayName: 'Moderate', value: 2 }
        }
      ]
    }]
  };
  const result = parsePollenResponse(response);
  assert.equal(result.length, 2);
  assert.equal(result[0].type, 'TREE');
  assert.equal(result[0].category, 'HIGH');
  assert.equal(result[0].dataType, 'forecast');
  assert.equal(result[1].type, 'GRASS');
  assert.equal(result[1].category, 'MODERATE');
});

test('parsePollenResponse returns only first day when multiple days returned', () => {
  const response = {
    dailyInfo: [
      {
        pollenTypeInfo: [
          { code: 'TREE', indexInfo: { code: 'HIGH' } }
        ]
      },
      {
        pollenTypeInfo: [
          { code: 'GRASS', indexInfo: { code: 'VERY_HIGH' } }
        ]
      }
    ]
  };
  const result = parsePollenResponse(response);
  assert.equal(result.length, 1);
  assert.equal(result[0].type, 'TREE');
});

// ---------------------------------------------------------------------------
// fetchAirNowForMetro - missing API key / failed API responses
// ---------------------------------------------------------------------------

test('fetchAirNowForMetro returns null when fetch throws', async () => {
  const mockFetch = () => Promise.reject(new Error('Network failure'));
  const metro = METRO_LIST[0];
  const result = await fetchAirNowForMetro(metro, 'test-key', mockFetch);
  assert.equal(result, null);
});

test('fetchAirNowForMetro returns null when response is not ok', async () => {
  const mockFetch = () => Promise.resolve({ ok: false, status: 403 });
  const metro = METRO_LIST[0];
  const result = await fetchAirNowForMetro(metro, 'test-key', mockFetch);
  assert.equal(result, null);
});

test('fetchAirNowForMetro parses successful response', async () => {
  const mockData = [
    { ParameterName: 'PM2.5', AQI: 120 },
    { ParameterName: 'O3', AQI: 85 }
  ];
  const mockFetch = () =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(mockData) });
  const metro = METRO_LIST[0];
  const result = await fetchAirNowForMetro(metro, 'test-key', mockFetch);
  assert.ok(result !== null);
  assert.equal(result.aqi, 120);
  assert.equal(result.pm25Aqi, 120);
});

// ---------------------------------------------------------------------------
// fetchPollenForMetro - missing API key / failed API responses
// ---------------------------------------------------------------------------

test('fetchPollenForMetro returns null when fetch throws', async () => {
  const mockFetch = () => Promise.reject(new Error('Network failure'));
  const metro = METRO_LIST[0];
  const result = await fetchPollenForMetro(metro, 'test-key', mockFetch);
  assert.equal(result, null);
});

test('fetchPollenForMetro returns null when response is not ok', async () => {
  const mockFetch = () => Promise.resolve({ ok: false, status: 403 });
  const metro = METRO_LIST[0];
  const result = await fetchPollenForMetro(metro, 'test-key', mockFetch);
  assert.equal(result, null);
});

test('fetchPollenForMetro parses successful response with HIGH pollen', async () => {
  const mockData = {
    dailyInfo: [{
      pollenTypeInfo: [
        { code: 'TREE', indexInfo: { code: 'HIGH' } },
        { code: 'GRASS', indexInfo: { code: 'LOW' } }
      ]
    }]
  };
  const mockFetch = () =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(mockData) });
  const metro = METRO_LIST[0];
  const result = await fetchPollenForMetro(metro, 'test-key', mockFetch);
  assert.ok(Array.isArray(result));
  assert.equal(result.length, 2);
  const treeEntry = result.find((r) => r.type === 'TREE');
  assert.ok(treeEntry);
  assert.equal(treeEntry.category, 'HIGH');
});

// ---------------------------------------------------------------------------
// fetchEnvironmentalConditions - integration scenarios
// ---------------------------------------------------------------------------

test('fetchEnvironmentalConditions handles missing API keys gracefully', async () => {
  const result = await fetchEnvironmentalConditions({
    airnowApiKey: undefined,
    googleMapsApiKey: undefined,
    date: '2024-11-15'
  });
  assert.ok(result !== null);
  assert.ok(['low', 'moderate', 'high'].includes(result.overallLevel));
  assert.equal(typeof result.pollutionMetroCount, 'number');
  assert.equal(typeof result.particleMetroCount, 'number');
  assert.ok(result.pollen);
  assert.equal(result.pollutionMetroCount, 0);
  assert.equal(result.particleMetroCount, 0);
  assert.equal(result.airQualityFetched, false);
  assert.equal(result.pollenDataFetched, false);
});

test('fetchEnvironmentalConditions uses seasonal pollen when googleMapsApiKey missing', async () => {
  // May has TREE and GRASS pollen in season
  const result = await fetchEnvironmentalConditions({
    airnowApiKey: undefined,
    googleMapsApiKey: undefined,
    date: '2024-05-15'
  });
  assert.equal(result.pollen.provider, 'seasonal-estimate');
  assert.ok(result.pollen.pollenMetroCount > 0, 'Should have pollen metros in May');
});

test('fetchEnvironmentalConditions uses seasonal-estimate provider in November (no active pollen)', async () => {
  const result = await fetchEnvironmentalConditions({
    airnowApiKey: undefined,
    googleMapsApiKey: undefined,
    date: '2024-11-15'
  });
  assert.equal(result.pollen.provider, 'seasonal-estimate');
  assert.equal(result.pollen.pollenMetroCount, 0);
});

test('fetchEnvironmentalConditions includes required fields', async () => {
  const result = await fetchEnvironmentalConditions({ date: '2024-06-01' });
  assert.ok('date' in result);
  assert.ok('overallLevel' in result);
  assert.ok('pollutionMetroCount' in result);
  assert.ok('particleMetroCount' in result);
  assert.ok('pollen' in result);
  assert.ok('sourceNotes' in result);
  assert.ok('limitations' in result);
  assert.ok(Array.isArray(result.limitations));
  assert.ok(Array.isArray(result.sourceNotes));
});

test('fetchEnvironmentalConditions handles AirNow API returning all failures gracefully', async () => {
  const mockFetch = () => Promise.reject(new Error('Network failure'));
  const result = await fetchEnvironmentalConditions({
    airnowApiKey: 'test-key',
    googleMapsApiKey: undefined,
    date: '2024-06-01',
    fetchImpl: mockFetch
  });
  assert.equal(result.pollutionMetroCount, 0);
  assert.equal(result.particleMetroCount, 0);
  assert.equal(result.airQualityFetched, true, 'airQualityFetched should be true even if all metros fail');
});

test('fetchEnvironmentalConditions handles Google Pollen API returning all failures, falls back to seasonal', async () => {
  const mockFetch = () => Promise.reject(new Error('Network failure'));
  const result = await fetchEnvironmentalConditions({
    airnowApiKey: undefined,
    googleMapsApiKey: 'test-key',
    date: '2024-05-01',
    fetchImpl: mockFetch
  });
  assert.equal(result.pollen.provider, 'seasonal-estimate');
  assert.ok(result.pollen.pollenMetroCount > 0, 'Should fall back to seasonal estimate in May');
});

test('fetchEnvironmentalConditions with AirNow data counts affected metros correctly', async () => {
  let callCount = 0;
  const mockFetch = (url) => {
    callCount += 1;
    // Return AQI >= 101 for first 3 metros, under threshold for rest
    const highAqi = callCount <= 3 ? 120 : 50;
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([{ ParameterName: 'O3', AQI: highAqi }])
    });
  };
  const result = await fetchEnvironmentalConditions({
    airnowApiKey: 'test-key',
    googleMapsApiKey: undefined,
    date: '2024-11-15',
    fetchImpl: mockFetch
  });
  assert.equal(result.pollutionMetroCount, 3);
  assert.equal(result.particleMetroCount, 0); // O3, not PM2.5
});

test('fetchEnvironmentalConditions with PM2.5 data counts particleMetroCount', async () => {
  let callCount = 0;
  const mockFetch = () => {
    callCount += 1;
    const aqi = callCount <= 2 ? 115 : 40;
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([{ ParameterName: 'PM2.5', AQI: aqi }])
    });
  };
  const result = await fetchEnvironmentalConditions({
    airnowApiKey: 'test-key',
    googleMapsApiKey: undefined,
    date: '2024-11-15',
    fetchImpl: mockFetch
  });
  assert.equal(result.particleMetroCount, 2);
});

test('fetchEnvironmentalConditions overallLevel computed from total signals', async () => {
  // 3 pollution + 3 pollen = 6 total signals = high
  let aqiCallCount = 0;
  const mockFetch = (url) => {
    if (url.includes('airnow')) {
      aqiCallCount += 1;
      const aqi = aqiCallCount <= 3 ? 120 : 45;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([{ ParameterName: 'O3', AQI: aqi }])
      });
    }
    return Promise.reject(new Error('not pollen'));
  };
  const result = await fetchEnvironmentalConditions({
    airnowApiKey: 'test-key',
    googleMapsApiKey: undefined,
    date: '2024-05-15', // May: TREE + GRASS pollen in season
    fetchImpl: mockFetch
  });
  // pollutionMetroCount=3, particleMetroCount=0, pollenMetroCount=41 (seasonal all metros)
  const total = result.pollutionMetroCount + result.particleMetroCount + result.pollen.pollenMetroCount;
  assert.equal(result.overallLevel, computeOverallLevel(total));
});

test('fetchEnvironmentalConditions date defaults to today when not provided', async () => {
  const result = await fetchEnvironmentalConditions({});
  assert.ok(typeof result.date === 'string');
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(result.date), 'date should be YYYY-MM-DD format');
});

// ---------------------------------------------------------------------------
// Rendering output
// ---------------------------------------------------------------------------
import { renderDailyReportPage } from '../../src/publish/render-pages.js';

function makeMinimalReport(overrides = {}) {
  return {
    run_date: '2024-06-01',
    run_id: 'test-run-env',
    url_counts: { processed: 5, succeeded: 5, failed: 0, excluded: 0 },
    aggregate_scores: {
      performance: 80,
      accessibility: 90,
      best_practices: 85,
      seo: 88,
      pwa: 0
    },
    estimated_impact: {
      traffic_window_mode: 'daily',
      affected_share_percent: 10,
      categories: []
    },
    history_series: [],
    top_urls: [],
    generated_at: '2024-06-01T00:00:00.000Z',
    report_status: 'success',
    readability_summary: {
      url_count_with_metrics: 0,
      url_count_low_density: 0,
      mean_word_count: null,
      mean_words_per_mb: null,
      low_density_urls: []
    },
    ...overrides
  };
}

test('renderDailyReportPage renders environmental section for low level', () => {
  const report = makeMinimalReport({
    environmental_conditions: {
      date: '2024-06-01',
      overallLevel: 'low',
      pollutionMetroCount: 0,
      particleMetroCount: 0,
      affectedMetros: [],
      pollen: {
        provider: 'seasonal-estimate',
        pollenMetroCount: 0,
        affectedMetros: [],
        sourceNote: 'Seasonal estimate.',
        limitations: []
      },
      sourceNotes: ['No air quality data.'],
      limitations: ['Heuristic only.'],
      airQualityFetched: false,
      pollenDataFetched: false
    }
  });
  const html = renderDailyReportPage(report);
  assert.ok(html.includes('Environmental conditions and situational disability'));
  assert.ok(html.includes('No widespread environmental accessibility signal'));
  assert.ok(html.includes('Signal level: Low'));
});

test('renderDailyReportPage renders environmental section for moderate level', () => {
  const report = makeMinimalReport({
    environmental_conditions: {
      date: '2024-06-01',
      overallLevel: 'moderate',
      pollutionMetroCount: 2,
      particleMetroCount: 1,
      affectedMetros: ['Chicago', 'Houston'],
      pollen: {
        provider: 'google-pollen',
        pollenMetroCount: 1,
        affectedMetros: [{ metro: 'Atlanta', pollenTypes: ['TREE'], category: 'HIGH', dataType: 'forecast' }],
        sourceNote: 'Google Pollen.',
        limitations: []
      },
      sourceNotes: ['AirNow data fetched.'],
      limitations: ['Heuristic.'],
      airQualityFetched: true,
      pollenDataFetched: true
    }
  });
  const html = renderDailyReportPage(report);
  assert.ok(html.includes('Environmental conditions and situational disability'));
  assert.ok(html.includes('may be affecting people in several'));
  assert.ok(html.includes('Signal level: Moderate'));
});

test('renderDailyReportPage renders environmental section for high level', () => {
  const report = makeMinimalReport({
    environmental_conditions: {
      date: '2024-06-01',
      overallLevel: 'high',
      pollutionMetroCount: 5,
      particleMetroCount: 4,
      affectedMetros: ['New York', 'Chicago', 'Houston'],
      pollen: {
        provider: 'google-pollen',
        pollenMetroCount: 10,
        affectedMetros: [],
        sourceNote: 'Google Pollen.',
        limitations: []
      },
      sourceNotes: ['AirNow live data.'],
      limitations: ['Heuristic.'],
      airQualityFetched: true,
      pollenDataFetched: true
    }
  });
  const html = renderDailyReportPage(report);
  assert.ok(html.includes('Environmental conditions and situational disability'));
  assert.ok(html.includes('likely affecting people across many'));
  assert.ok(html.includes('Signal level: High'));
});

test('renderDailyReportPage renders environmental section for unavailable data', () => {
  const report = makeMinimalReport({
    environmental_conditions: {
      date: '2024-11-15',
      overallLevel: 'low',
      pollutionMetroCount: 0,
      particleMetroCount: 0,
      affectedMetros: [],
      pollen: {
        provider: 'unavailable',
        pollenMetroCount: 0,
        affectedMetros: [],
        sourceNote: 'Pollen data unavailable.',
        limitations: []
      },
      sourceNotes: ['Air quality unavailable.'],
      limitations: ['Heuristic.'],
      airQualityFetched: false,
      pollenDataFetched: false
    }
  });
  const html = renderDailyReportPage(report);
  assert.ok(html.includes('Environmental conditions and situational disability'));
  assert.ok(html.includes('Unavailable'));
});

test('renderDailyReportPage omits environmental section when environmental_conditions is null', () => {
  const report = makeMinimalReport({ environmental_conditions: null });
  const html = renderDailyReportPage(report);
  assert.ok(!html.includes('Environmental conditions and situational disability'));
});

test('renderDailyReportPage omits environmental section when environmental_conditions is not in report', () => {
  const report = makeMinimalReport();
  const html = renderDailyReportPage(report);
  assert.ok(!html.includes('Environmental conditions and situational disability'));
});

test('renderDailyReportPage includes pollen transparency note', () => {
  const report = makeMinimalReport({
    environmental_conditions: {
      date: '2024-06-01',
      overallLevel: 'low',
      pollutionMetroCount: 0,
      particleMetroCount: 0,
      affectedMetros: [],
      pollen: {
        provider: 'seasonal-estimate',
        pollenMetroCount: 5,
        affectedMetros: [],
        sourceNote: 'Seasonal estimate.',
        limitations: []
      },
      sourceNotes: [],
      limitations: [],
      airQualityFetched: false,
      pollenDataFetched: false
    }
  });
  const html = renderDailyReportPage(report);
  assert.ok(html.includes('Pollen conditions are based on Google Pollen data when available'));
});

test('renderDailyReportPage escapes HTML in metro names', () => {
  const report = makeMinimalReport({
    environmental_conditions: {
      date: '2024-06-01',
      overallLevel: 'moderate',
      pollutionMetroCount: 1,
      particleMetroCount: 0,
      affectedMetros: ['<script>alert("xss")</script>'],
      pollen: {
        provider: 'seasonal-estimate',
        pollenMetroCount: 0,
        affectedMetros: [],
        sourceNote: 'Seasonal estimate.',
        limitations: []
      },
      sourceNotes: [],
      limitations: [],
      airQualityFetched: true,
      pollenDataFetched: false
    }
  });
  const html = renderDailyReportPage(report);
  assert.ok(!html.includes('<script>alert("xss")</script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});
