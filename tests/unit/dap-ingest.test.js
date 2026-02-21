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
