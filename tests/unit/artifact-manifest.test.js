import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { buildArtifactManifest } from '../../src/publish/artifact-manifest.js';

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

const SAMPLE_REPORT = { run_date: '2024-11-15', run_id: 'run-2024-11-15-abc123', scores: { accessibility: 85 } };
const SAMPLE_HISTORY = { entries: [{ run_date: '2024-11-15' }] };

test('buildArtifactManifest returns object with expected top-level fields', () => {
  const manifest = buildArtifactManifest({
    runId: 'run-2024-11-15-abc123',
    runDate: '2024-11-15',
    report: SAMPLE_REPORT,
    historyIndex: SAMPLE_HISTORY
  });

  assert.ok('run_id' in manifest);
  assert.ok('run_date' in manifest);
  assert.ok('generated_at' in manifest);
  assert.ok(Array.isArray(manifest.files));
  assert.equal(manifest.files.length, 2);
});

test('buildArtifactManifest sets run_id and run_date from inputs', () => {
  const manifest = buildArtifactManifest({
    runId: 'run-2024-11-15-abc123',
    runDate: '2024-11-15',
    report: SAMPLE_REPORT,
    historyIndex: SAMPLE_HISTORY
  });

  assert.equal(manifest.run_id, 'run-2024-11-15-abc123');
  assert.equal(manifest.run_date, '2024-11-15');
});

test('buildArtifactManifest file entries have path, sha256, and bytes', () => {
  const manifest = buildArtifactManifest({
    runId: 'run-2024-11-15-abc123',
    runDate: '2024-11-15',
    report: SAMPLE_REPORT,
    historyIndex: SAMPLE_HISTORY
  });

  for (const file of manifest.files) {
    assert.ok(typeof file.path === 'string' && file.path.length > 0, 'path is non-empty string');
    assert.ok(typeof file.sha256 === 'string', 'sha256 is a string');
    assert.match(file.sha256, /^[0-9a-f]{64}$/, 'sha256 is a 64-char hex string');
    assert.ok(typeof file.bytes === 'number' && file.bytes > 0, 'bytes is a positive number');
  }
});

test('buildArtifactManifest first file is the daily report', () => {
  const manifest = buildArtifactManifest({
    runId: 'run-2024-11-15-abc123',
    runDate: '2024-11-15',
    report: SAMPLE_REPORT,
    historyIndex: SAMPLE_HISTORY
  });

  assert.equal(manifest.files[0].path, 'docs/reports/daily/2024-11-15/report.json');
});

test('buildArtifactManifest second file is the history index', () => {
  const manifest = buildArtifactManifest({
    runId: 'run-2024-11-15-abc123',
    runDate: '2024-11-15',
    report: SAMPLE_REPORT,
    historyIndex: SAMPLE_HISTORY
  });

  assert.equal(manifest.files[1].path, 'docs/reports/history.json');
});

test('buildArtifactManifest sha256 matches stable JSON serialization of report', () => {
  const manifest = buildArtifactManifest({
    runId: 'run-2024-11-15-abc123',
    runDate: '2024-11-15',
    report: SAMPLE_REPORT,
    historyIndex: SAMPLE_HISTORY
  });

  const expectedContent = `${JSON.stringify(SAMPLE_REPORT, null, 2)}\n`;
  const expectedHash = sha256(expectedContent);
  assert.equal(manifest.files[0].sha256, expectedHash);
});

test('buildArtifactManifest sha256 is deterministic for identical inputs', () => {
  const input = {
    runId: 'run-2024-11-15-abc123',
    runDate: '2024-11-15',
    report: SAMPLE_REPORT,
    historyIndex: SAMPLE_HISTORY
  };

  const m1 = buildArtifactManifest(input);
  const m2 = buildArtifactManifest(input);

  assert.equal(m1.files[0].sha256, m2.files[0].sha256);
  assert.equal(m1.files[1].sha256, m2.files[1].sha256);
});

test('buildArtifactManifest sha256 changes when report content changes', () => {
  const base = { runId: 'run-2024-11-15-abc123', runDate: '2024-11-15', historyIndex: SAMPLE_HISTORY };
  const m1 = buildArtifactManifest({ ...base, report: { score: 80 } });
  const m2 = buildArtifactManifest({ ...base, report: { score: 90 } });

  assert.notEqual(m1.files[0].sha256, m2.files[0].sha256);
});

test('buildArtifactManifest bytes matches UTF-8 byte length of serialized content', () => {
  const manifest = buildArtifactManifest({
    runId: 'run-2024-11-15-abc123',
    runDate: '2024-11-15',
    report: SAMPLE_REPORT,
    historyIndex: SAMPLE_HISTORY
  });

  const expectedContent = `${JSON.stringify(SAMPLE_REPORT, null, 2)}\n`;
  const expectedBytes = Buffer.byteLength(expectedContent, 'utf8');
  assert.equal(manifest.files[0].bytes, expectedBytes);
});
