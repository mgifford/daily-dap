import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import test from 'node:test';
import assert from 'node:assert/strict';
import { runDailyScan } from '../../src/cli/run-daily-scan.js';

function fixturePath(name) {
  return path.resolve(process.cwd(), 'tests', 'fixtures', name);
}

async function createTempWorkspace() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'daily-dap-smoke-'));
  await fs.mkdir(path.join(root, 'docs', 'reports', 'daily'), { recursive: true });
  await fs.writeFile(
    path.join(root, 'docs', 'reports', 'history.json'),
    JSON.stringify({ generated_at: null, lookback_days: 30, entries: [] }, null, 2),
    'utf8'
  );
  return root;
}

test('runDailyScan publishes report snapshot in mock full mode', async () => {
  const outputRoot = await createTempWorkspace();

  const summary = await runDailyScan({
    dryRun: false,
    configPath: null,
    sourceFile: fixturePath('dap-sample.json'),
    urlLimit: 5,
    trafficWindowMode: 'daily',
    runDate: '2026-02-21',
    scanMode: 'mock',
    mockFailUrl: [],
    outputRoot,
    concurrency: 2,
    timeoutMs: 20000,
    maxRetries: 1
  });

  assert.equal(summary.status, 'success');

  const reportPath = path.join(outputRoot, 'docs', 'reports', 'daily', '2026-02-21', 'report.json');
  const reportRaw = await fs.readFile(reportPath, 'utf8');
  const report = JSON.parse(reportRaw);

  assert.equal(report.run_date, '2026-02-21');
  assert.ok(report.url_counts.processed > 0);
  assert.equal(typeof report.aggregate_scores.performance, 'number');

  const historyRaw = await fs.readFile(path.join(outputRoot, 'docs', 'reports', 'history.json'), 'utf8');
  const history = JSON.parse(historyRaw);
  assert.equal(history.entries[0].run_date, '2026-02-21');
});

test('runDailyScan handles partial scanner failures and missing traffic records', async () => {
  const outputRoot = await createTempWorkspace();

  const summary = await runDailyScan({
    dryRun: false,
    configPath: null,
    sourceFile: fixturePath('dap-sample.json'),
    urlLimit: 6,
    trafficWindowMode: 'daily',
    runDate: '2026-02-22',
    scanMode: 'mock',
    mockFailUrl: ['/c'],
    outputRoot,
    concurrency: 3,
    timeoutMs: 20000,
    maxRetries: 0
  });

  assert.equal(summary.status, 'success');

  const reportPath = path.join(outputRoot, 'docs', 'reports', 'daily', '2026-02-22', 'report.json');
  const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
  const reportPagePath = path.join(outputRoot, 'docs', 'reports', 'daily', '2026-02-22', 'index.html');
  const reportPage = await fs.readFile(reportPagePath, 'utf8');

  assert.ok(report.url_counts.failed >= 1);
  assert.ok(report.url_counts.excluded >= 1);
  assert.equal(report.report_status, 'partial');
  assert.equal(typeof report.scan_diagnostics.failure_reasons.execution_error, 'number');
  assert.match(reportPage, /Report generated at:/);
  assert.doesNotMatch(reportPage, /All scans failed with execution errors/);
});

test('runDailyScan renders scanner notice when all attempted scans fail with execution_error', async () => {
  const outputRoot = await createTempWorkspace();

  await runDailyScan({
    dryRun: false,
    configPath: null,
    sourceFile: fixturePath('dap-sample.json'),
    urlLimit: 6,
    trafficWindowMode: 'daily',
    runDate: '2026-02-23',
    scanMode: 'mock',
    mockFailUrl: ['example.gov'],
    outputRoot,
    concurrency: 3,
    timeoutMs: 20000,
    maxRetries: 0
  });

  const reportPath = path.join(outputRoot, 'docs', 'reports', 'daily', '2026-02-23', 'report.json');
  const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
  const reportPagePath = path.join(outputRoot, 'docs', 'reports', 'daily', '2026-02-23', 'index.html');
  const reportPage = await fs.readFile(reportPagePath, 'utf8');

  assert.equal(report.url_counts.succeeded, 0);
  assert.ok(report.url_counts.failed >= 1);
  assert.equal(report.scan_diagnostics.failure_reasons.execution_error, report.scan_diagnostics.failed_count);
  assert.match(reportPage, /All scans failed with execution errors/);
});
