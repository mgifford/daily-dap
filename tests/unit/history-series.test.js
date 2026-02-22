import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHistorySeries } from '../../src/aggregation/history-series.js';

test('buildHistorySeries defaults to 30 day window and fills missing days', () => {
  const result = buildHistorySeries(
    [
      { run_date: '2026-02-20', aggregate_scores: { performance: 80 } },
      { run_date: '2026-02-18', aggregate_scores: { performance: 75 } }
    ],
    { runDate: '2026-02-20' }
  );

  assert.equal(result.window_days, 30);
  assert.equal(result.start_date, '2026-01-22');
  assert.equal(result.end_date, '2026-02-20');
  assert.equal(result.history_series.length, 30);

  const feb19 = result.history_series.find((item) => item.run_date === '2026-02-19');
  assert.equal(feb19.missing, true);

  const feb18 = result.history_series.find((item) => item.run_date === '2026-02-18');
  assert.equal(feb18.aggregate_scores.performance, 75);
});

test('buildHistorySeries supports mode-based configurable lookback', () => {
  const result = buildHistorySeries(
    [{ run_date: '2026-02-20', aggregate_scores: { performance: 80 } }],
    {
      runDate: '2026-02-20',
      trafficWindowMode: 'rolling_7d',
      lookbackByMode: {
        daily: 30,
        rolling_7d: 7,
        rolling_30d: 30
      }
    }
  );

  assert.equal(result.window_days, 7);
  assert.equal(result.start_date, '2026-02-14');
  assert.equal(result.end_date, '2026-02-20');
  assert.equal(result.history_series.length, 7);
  assert.equal(result.traffic_window_mode, 'rolling_7d');
});
