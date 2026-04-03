import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRunMetadata } from '../../src/lib/run-metadata.js';

test('createRunMetadata returns object with all expected fields', () => {
  const meta = createRunMetadata({
    runDate: '2024-11-15',
    trafficWindowMode: 'rolling30',
    urlLimit: 20,
    source: 'dap'
  });

  assert.ok('run_id' in meta);
  assert.ok('run_date' in meta);
  assert.ok('traffic_window_mode' in meta);
  assert.ok('url_limit_requested' in meta);
  assert.ok('source' in meta);
  assert.ok('generated_at' in meta);
});

test('createRunMetadata run_id starts with "run-" followed by the date', () => {
  const meta = createRunMetadata({
    runDate: '2024-11-15',
    trafficWindowMode: 'rolling30',
    urlLimit: 20
  });

  assert.ok(meta.run_id.startsWith('run-2024-11-15-'));
});

test('createRunMetadata run_id digest is 10 hex characters', () => {
  const meta = createRunMetadata({
    runDate: '2024-11-15',
    trafficWindowMode: 'rolling30',
    urlLimit: 20
  });

  // Format: "run-YYYY-MM-DD-<10-char-hex>"
  const parts = meta.run_id.split('-');
  const digest = parts[parts.length - 1];
  assert.match(digest, /^[0-9a-f]{10}$/);
});

test('createRunMetadata is deterministic for identical inputs', () => {
  const input = { runDate: '2024-11-15', trafficWindowMode: 'rolling30', urlLimit: 20, source: 'dap' };
  const meta1 = createRunMetadata(input);
  const meta2 = createRunMetadata(input);

  assert.equal(meta1.run_id, meta2.run_id);
  assert.equal(meta1.run_date, meta2.run_date);
});

test('createRunMetadata produces different run_id for different dates', () => {
  const base = { trafficWindowMode: 'rolling30', urlLimit: 20, source: 'dap' };
  const meta1 = createRunMetadata({ ...base, runDate: '2024-11-15' });
  const meta2 = createRunMetadata({ ...base, runDate: '2024-11-16' });

  assert.notEqual(meta1.run_id, meta2.run_id);
});

test('createRunMetadata produces different run_id for different urlLimits', () => {
  const base = { runDate: '2024-11-15', trafficWindowMode: 'rolling30', source: 'dap' };
  const meta1 = createRunMetadata({ ...base, urlLimit: 20 });
  const meta2 = createRunMetadata({ ...base, urlLimit: 100 });

  assert.notEqual(meta1.run_id, meta2.run_id);
});

test('createRunMetadata defaults source to "dap"', () => {
  const meta = createRunMetadata({
    runDate: '2024-11-15',
    trafficWindowMode: 'rolling30',
    urlLimit: 20
  });

  assert.equal(meta.source, 'dap');
});

test('createRunMetadata preserves provided source value', () => {
  const meta = createRunMetadata({
    runDate: '2024-11-15',
    trafficWindowMode: 'rolling30',
    urlLimit: 20,
    source: 'file'
  });

  assert.equal(meta.source, 'file');
});

test('createRunMetadata sets run_date to provided runDate', () => {
  const meta = createRunMetadata({
    runDate: '2025-03-01',
    trafficWindowMode: 'rolling30',
    urlLimit: 10
  });

  assert.equal(meta.run_date, '2025-03-01');
});

test('createRunMetadata generated_at is a valid ISO-8601 timestamp', () => {
  const meta = createRunMetadata({
    runDate: '2024-11-15',
    trafficWindowMode: 'rolling30',
    urlLimit: 20
  });

  const parsed = new Date(meta.generated_at);
  assert.ok(!Number.isNaN(parsed.getTime()));
});

test('createRunMetadata sets traffic_window_mode and url_limit_requested', () => {
  const meta = createRunMetadata({
    runDate: '2024-11-15',
    trafficWindowMode: 'rolling7',
    urlLimit: 50
  });

  assert.equal(meta.traffic_window_mode, 'rolling7');
  assert.equal(meta.url_limit_requested, 50);
});
