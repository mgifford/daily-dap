import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import test from 'node:test';
import assert from 'node:assert/strict';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { buildDailyReport } from '../../src/publish/build-daily-report.js';
import { buildHistoryIndex } from '../../src/publish/build-history-index.js';
import { writeCommittedSnapshot } from '../../src/publish/archive-writer.js';
import { buildArtifactManifest } from '../../src/publish/artifact-manifest.js';

async function loadReportValidator() {
  const schemaPath = path.resolve(process.cwd(), '../../kitty-specs/002-daily-dap-quality-benchmarking/contracts/daily-report.schema.json');
  const schemaRaw = await fs.readFile(schemaPath, 'utf8');
  const schema = JSON.parse(schemaRaw);

  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv.compile(schema);
}

function createReportFixture(overrides = {}) {
  const runMetadata = {
    run_date: '2026-02-21',
    run_id: 'run-2026-02-21-abc123',
    url_limit_requested: 100,
    traffic_window_mode: 'daily',
    generated_at: '2026-02-21T22:00:00.000Z'
  };

  const scoreSummary = {
    aggregate_scores: {
      performance: { mean_score: 85 },
      accessibility: { mean_score: 90 },
      best_practices: { mean_score: 80 },
      seo: { mean_score: 88 },
      pwa: { mean_score: 70 }
    }
  };

  const weightedImpact = {
    traffic_window_mode: 'daily',
    totals: {
      affected_share_percent: 22.5
    }
  };

  const prevalenceImpact = {
    categories: {
      blindness: { prevalence_rate: 0.01, estimated_impacted_users: 50 },
      low_vision: { prevalence_rate: 0.2, estimated_impacted_users: 1000 }
    }
  };

  const historyWindow = {
    window_days: 30,
    history_series: [
      {
        run_date: '2026-02-20',
        aggregate_scores: {
          performance: 82,
          accessibility: 89,
          best_practices: 79,
          seo: 87,
          pwa: 69
        }
      }
    ]
  };

  const urlResults = [
    { scan_status: 'success' },
    { scan_status: 'success' },
    { scan_status: 'failed' },
    { scan_status: 'excluded' }
  ];

  return buildDailyReport({
    runMetadata,
    scoreSummary,
    weightedImpact,
    prevalenceImpact,
    historyWindow,
    urlResults,
    ...overrides
  });
}

test('daily report success payload validates against schema', async () => {
  const validate = await loadReportValidator();
  const report = createReportFixture();

  const valid = validate(report);
  assert.equal(valid, true, JSON.stringify(validate.errors, null, 2));
});

test('daily report failure-style payload validates against schema', async () => {
  const validate = await loadReportValidator();

  const report = createReportFixture({
    scoreSummary: {
      aggregate_scores: {
        performance: { mean_score: 0 },
        accessibility: { mean_score: 0 },
        best_practices: { mean_score: 0 },
        seo: { mean_score: 0 },
        pwa: { mean_score: 0 }
      }
    },
    weightedImpact: {
      traffic_window_mode: 'daily',
      totals: { affected_share_percent: 0 }
    },
    prevalenceImpact: { categories: {} },
    historyWindow: {
      window_days: 30,
      history_series: []
    },
    urlResults: [{ scan_status: 'failed' }]
  });

  const valid = validate(report);
  assert.equal(valid, true, JSON.stringify(validate.errors, null, 2));
});

test('snapshot writer and artifact manifest stay in sync', async () => {
  const report = createReportFixture();
  const historyIndex = buildHistoryIndex([], report, { lookbackDays: 30 });
  const manifest = buildArtifactManifest({
    runId: report.run_id,
    runDate: report.run_date,
    report,
    historyIndex
  });

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'daily-dap-wp04-'));
  await writeCommittedSnapshot({
    repoRoot: tempRoot,
    report,
    historyIndex,
    dashboardContext: { historyEntries: historyIndex.entries }
  });

  const reportPath = path.join(tempRoot, 'docs', 'reports', 'daily', report.run_date, 'report.json');
  const historyPath = path.join(tempRoot, 'docs', 'reports', 'history.json');
  const dashboardPath = path.join(tempRoot, 'docs', 'reports', 'index.html');

  const reportStat = await fs.stat(reportPath);
  const historyStat = await fs.stat(historyPath);
  const dashboardStat = await fs.stat(dashboardPath);

  assert.equal(reportStat.isFile(), true);
  assert.equal(historyStat.isFile(), true);
  assert.equal(dashboardStat.isFile(), true);

  assert.equal(manifest.files.some((file) => file.path === `docs/reports/daily/${report.run_date}/report.json`), true);
  assert.equal(manifest.files.some((file) => file.path === 'docs/reports/history.json'), true);
});
