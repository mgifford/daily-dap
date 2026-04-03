import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHistoryIndex } from '../../src/publish/build-history-index.js';

const makeReport = (runDate, runId = `run-${runDate}-abc123`) => ({
  run_date: runDate,
  run_id: runId,
  generated_at: `${runDate}T12:00:00.000Z`
});

test('buildHistoryIndex creates a new index from empty existing entries', () => {
  const result = buildHistoryIndex([], makeReport('2024-11-15'));

  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0].run_date, '2024-11-15');
});

test('buildHistoryIndex entry has expected fields', () => {
  const report = makeReport('2024-11-15');
  const result = buildHistoryIndex([], report);
  const entry = result.entries[0];

  assert.equal(entry.run_date, '2024-11-15');
  assert.equal(entry.run_id, report.run_id);
  assert.equal(entry.report_path, 'daily/2024-11-15/report.json');
  assert.equal(entry.page_path, 'daily/2024-11-15/index.html');
  assert.equal(entry.generated_at, report.generated_at);
});

test('buildHistoryIndex prepends latest entry and deduplicates by run_date', () => {
  const existing = [
    { run_date: '2024-11-15', run_id: 'old-id', report_path: 'daily/2024-11-15/report.json', page_path: 'daily/2024-11-15/index.html', generated_at: '2024-11-15T08:00:00.000Z' },
    { run_date: '2024-11-14', run_id: 'run-nov14', report_path: 'daily/2024-11-14/report.json', page_path: 'daily/2024-11-14/index.html', generated_at: '2024-11-14T12:00:00.000Z' }
  ];

  const result = buildHistoryIndex(existing, makeReport('2024-11-15'));

  assert.equal(result.entries.length, 2);
  // Latest run replaces old entry for same date
  assert.equal(result.entries[0].run_date, '2024-11-15');
  assert.notEqual(result.entries[0].run_id, 'old-id');
});

test('buildHistoryIndex sorts entries by run_date descending', () => {
  const existing = [
    { run_date: '2024-11-13', run_id: 'r1', report_path: '', page_path: '', generated_at: '' },
    { run_date: '2024-11-14', run_id: 'r2', report_path: '', page_path: '', generated_at: '' }
  ];

  const result = buildHistoryIndex(existing, makeReport('2024-11-15'));
  const dates = result.entries.map((e) => e.run_date);

  assert.deepEqual(dates, ['2024-11-15', '2024-11-14', '2024-11-13']);
});

test('buildHistoryIndex limits entries to lookbackDays', () => {
  const existing = Array.from({ length: 40 }, (_, i) => {
    const d = String(i + 1).padStart(2, '0');
    return { run_date: `2024-10-${d}`, run_id: `r${i}`, report_path: '', page_path: '', generated_at: '' };
  });

  const result = buildHistoryIndex(existing, makeReport('2024-11-15'), { lookbackDays: 30 });

  assert.equal(result.entries.length, 30);
  assert.equal(result.lookback_days, 30);
});

test('buildHistoryIndex uses default lookback of 30 when not specified', () => {
  const result = buildHistoryIndex([], makeReport('2024-11-15'));

  assert.equal(result.lookback_days, 30);
});

test('buildHistoryIndex uses custom lookbackDays option', () => {
  const result = buildHistoryIndex([], makeReport('2024-11-15'), { lookbackDays: 7 });

  assert.equal(result.lookback_days, 7);
});

test('buildHistoryIndex falls back to default for invalid lookbackDays', () => {
  const r1 = buildHistoryIndex([], makeReport('2024-11-15'), { lookbackDays: -1 });
  const r2 = buildHistoryIndex([], makeReport('2024-11-15'), { lookbackDays: 0 });
  const r3 = buildHistoryIndex([], makeReport('2024-11-15'), { lookbackDays: 'foo' });

  assert.equal(r1.lookback_days, 30);
  assert.equal(r2.lookback_days, 30);
  assert.equal(r3.lookback_days, 30);
});

test('buildHistoryIndex generated_at mirrors latestReport.generated_at', () => {
  const report = makeReport('2024-11-15');
  const result = buildHistoryIndex([], report);

  assert.equal(result.generated_at, report.generated_at);
});
