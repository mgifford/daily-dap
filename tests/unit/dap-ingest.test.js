import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readDapRecordsFromFile, normalizeDapRecords, getNormalizedTopPages } from '../../src/ingest/dap-source.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(currentDir, '../fixtures/dap-sample.json');

test('readDapRecordsFromFile reads fixture payload', async () => {
  const records = await readDapRecordsFromFile(fixturePath);
  assert.equal(records.length, 6);
});

test('normalizeDapRecords sorts by load desc and url asc tie-break', async () => {
  const records = await readDapRecordsFromFile(fixturePath);
  const normalized = normalizeDapRecords(records, {
    limit: 4,
    sourceDate: '2026-02-21'
  });

  assert.equal(normalized.records.length, 4);
  assert.equal(normalized.records[0].url, 'https://example.gov/a');
  assert.equal(normalized.records[1].url, 'https://example.gov/b');
  assert.equal(normalized.records[2].url, 'https://example.gov/c');
  assert.equal(normalized.records[3].url, 'https://example.gov/d');
});

test('normalizeDapRecords flags missing page load counts', async () => {
  const records = await readDapRecordsFromFile(fixturePath);
  const normalized = normalizeDapRecords(records, {
    limit: 10,
    sourceDate: '2026-02-21'
  });

  assert.ok(normalized.warnings.some((warning) => warning.code === 'missing_page_load_count'));
});

test('getNormalizedTopPages supports file-based ingest path', async () => {
  const result = await getNormalizedTopPages({
    sourceFile: fixturePath,
    limit: 3,
    sourceDate: '2026-02-21'
  });

  assert.equal(result.records.length, 3);
  assert.equal(result.records[0].source_date, '2026-02-21');
});

test('normalizeDapRecords filters out DAP placeholder entries like (other)', () => {
  const records = [
    { url: 'https://example.gov', page_load_count: 5000 },
    { url: '(other)', page_load_count: 2000000 },
    { url: 'https://(other)', page_load_count: 1500000 }
  ];
  const normalized = normalizeDapRecords(records, { limit: 10, sourceDate: '2026-03-01' });

  assert.equal(normalized.records.length, 1, 'Should only keep real URLs');
  assert.equal(normalized.records[0].url, 'https://example.gov');
  assert.equal(normalized.excluded.filter((e) => e.reason === 'placeholder_url').length, 2, 'Should exclude both placeholder entries');
});

test('getNormalizedTopPages forwards limit as a query param to the API endpoint', async () => {
  let capturedEndpoint;
  const mockFetch = async (url) => {
    capturedEndpoint = url;
    return {
      ok: true,
      json: async () => [{ url: 'https://example.gov', page_load_count: 1000 }]
    };
  };

  await getNormalizedTopPages({
    endpoint: 'https://api.gsa.gov/analytics/dap/v2.0.0/reports/site/data',
    limit: 50,
    sourceDate: '2026-03-01',
    fetchImpl: mockFetch
  });

  const resolved = new URL(capturedEndpoint);
  assert.equal(resolved.searchParams.get('limit'), '50', 'limit should be forwarded as a query param');
});

test('getNormalizedTopPages does not override a limit already present in the endpoint URL', async () => {
  let capturedEndpoint;
  const mockFetch = async (url) => {
    capturedEndpoint = url;
    return {
      ok: true,
      json: async () => [{ url: 'https://example.gov', page_load_count: 1000 }]
    };
  };

  await getNormalizedTopPages({
    endpoint: 'https://api.gsa.gov/analytics/dap/v2.0.0/reports/site/data?limit=200',
    limit: 50,
    sourceDate: '2026-03-01',
    fetchImpl: mockFetch
  });

  const resolved = new URL(capturedEndpoint);
  assert.equal(resolved.searchParams.get('limit'), '200', 'pre-set limit in endpoint URL should not be overridden');
});

test('normalizeDapRecords uses the requested target date when dated records are available', () => {
  const records = [
    { url: 'https://example.gov/a', page_load_count: 400, date: '2026-02-20' },
    { url: 'https://example.gov/a', page_load_count: 200, date: '2026-02-19' },
    { url: 'https://example.gov/b', page_load_count: 300, date: '2026-02-20' },
    { url: 'https://example.gov/b', page_load_count: 100, date: '2026-02-19' }
  ];

  const normalized = normalizeDapRecords(records, {
    limit: 10,
    sourceDate: '2026-02-21',
    targetDate: '2026-02-20',
    trafficWindowMode: 'daily'
  });

  assert.equal(normalized.records.length, 2);
  assert.deepEqual(
    normalized.records.map((record) => ({ url: record.url, source_date: record.source_date, page_load_count: record.page_load_count })),
    [
      { url: 'https://example.gov/a', source_date: '2026-02-20', page_load_count: 400 },
      { url: 'https://example.gov/b', source_date: '2026-02-20', page_load_count: 300 }
    ]
  );
});

test('normalizeDapRecords warns and falls back to the latest available date when the target date is missing', () => {
  const records = [
    { url: 'https://example.gov/a', page_load_count: 400, date: '2026-02-18' },
    { url: 'https://example.gov/b', page_load_count: 300, date: '2026-02-18' }
  ];

  const normalized = normalizeDapRecords(records, {
    limit: 10,
    sourceDate: '2026-02-21',
    targetDate: '2026-02-20',
    trafficWindowMode: 'daily'
  });

  assert.equal(normalized.records[0].source_date, '2026-02-18');
  assert.ok(
    normalized.warnings.some((warning) => warning.code === 'target_source_date_unavailable'),
    'expected target-date fallback warning'
  );
});

test('normalizeDapRecords computes rolling averages from dated history and sorts by the selected traffic window', () => {
  const records = [
    { url: 'https://example.gov/a', page_load_count: 100, date: '2026-02-18' },
    { url: 'https://example.gov/a', page_load_count: 200, date: '2026-02-19' },
    { url: 'https://example.gov/a', page_load_count: 300, date: '2026-02-20' },
    { url: 'https://example.gov/b', page_load_count: 30, date: '2026-02-18' },
    { url: 'https://example.gov/b', page_load_count: 90, date: '2026-02-20' },
    { url: 'https://example.gov/c', page_load_count: 50, date: '2026-02-20' }
  ];

  const normalized = normalizeDapRecords(records, {
    limit: 10,
    sourceDate: '2026-02-21',
    targetDate: '2026-02-20',
    trafficWindowMode: 'rolling_7d'
  });

  assert.deepEqual(
    normalized.records.map((record) => ({
      url: record.url,
      daily: record.page_load_count_daily,
      rolling_7d: record.page_load_count_rolling_7d,
      page_load_count: record.page_load_count
    })),
    [
      { url: 'https://example.gov/a', daily: 300, rolling_7d: 200, page_load_count: 200 },
      { url: 'https://example.gov/b', daily: 90, rolling_7d: 60, page_load_count: 60 },
      { url: 'https://example.gov/c', daily: 50, rolling_7d: 50, page_load_count: 50 }
    ]
  );
});
