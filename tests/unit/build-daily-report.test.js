import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCodeQualitySummary, buildDailyReport } from '../../src/publish/build-daily-report.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeUrlResult(overrides = {}) {
  return {
    url: 'https://example.gov/',
    scan_status: 'success',
    page_load_count: 1000,
    lighthouse_performance: 80,
    lighthouse_accessibility: 90,
    lighthouse_best_practices: 85,
    lighthouse_seo: 88,
    lighthouse_pwa: 0,
    core_web_vitals_status: 'good',
    lcp_value_ms: 2000,
    axe_findings: [],
    detected_technologies: null,
    code_quality_audits: null,
    readability_metrics: null,
    ...overrides
  };
}

function makeRunMetadata(overrides = {}) {
  return {
    run_date: '2024-11-15',
    run_id: 'run-2024-11-15-abc123',
    url_limit_requested: 20,
    traffic_window_mode: 'daily',
    generated_at: '2024-11-15T12:00:00.000Z',
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// buildCodeQualitySummary
// ---------------------------------------------------------------------------

test('buildCodeQualitySummary returns correct shape on empty input', () => {
  const summary = buildCodeQualitySummary([]);
  assert.equal(summary.total_scanned, 0);
  assert.equal(summary.urls_with_deprecated_apis, 0);
  assert.equal(summary.urls_with_console_errors, 0);
  assert.equal(summary.urls_with_document_write, 0);
  assert.equal(summary.urls_with_vulnerable_libraries, 0);
  assert.deepEqual(summary.js_library_counts, {});
  assert.deepEqual(summary.vulnerable_library_counts, {});
  assert.deepEqual(summary.audit_urls.deprecated_apis, []);
  assert.deepEqual(summary.audit_urls.console_errors, []);
  assert.deepEqual(summary.audit_urls.document_write, []);
  assert.deepEqual(summary.audit_urls.vulnerable_libraries, []);
});

test('buildCodeQualitySummary called with no args defaults to empty array', () => {
  const summary = buildCodeQualitySummary();
  assert.equal(summary.total_scanned, 0);
});

test('buildCodeQualitySummary only counts results with scan_status success and code_quality_audits', () => {
  const results = [
    makeUrlResult({ scan_status: 'failed', code_quality_audits: { deprecated_apis: { passing: false, items: [] } } }),
    makeUrlResult({ scan_status: 'excluded', code_quality_audits: { deprecated_apis: { passing: false, items: [] } } }),
    makeUrlResult({ scan_status: 'success', code_quality_audits: null }),
    makeUrlResult({ scan_status: 'success', code_quality_audits: {} })
  ];
  const summary = buildCodeQualitySummary(results);
  assert.equal(summary.total_scanned, 1);
});

test('buildCodeQualitySummary counts URLs with deprecated APIs failing', () => {
  const results = [
    makeUrlResult({ url: 'https://a.gov/', code_quality_audits: { deprecated_apis: { passing: false, items: [{ api: 'x' }] } } }),
    makeUrlResult({ url: 'https://b.gov/', code_quality_audits: { deprecated_apis: { passing: true, items: [] } } })
  ];
  const summary = buildCodeQualitySummary(results);
  assert.equal(summary.urls_with_deprecated_apis, 1);
  assert.deepEqual(summary.audit_urls.deprecated_apis, ['https://a.gov/']);
});

test('buildCodeQualitySummary counts URLs with console errors failing', () => {
  const results = [
    makeUrlResult({ url: 'https://a.gov/', code_quality_audits: { errors_in_console: { passing: false, count: 3 } } }),
    makeUrlResult({ url: 'https://b.gov/', code_quality_audits: { errors_in_console: { passing: true, count: 0 } } })
  ];
  const summary = buildCodeQualitySummary(results);
  assert.equal(summary.urls_with_console_errors, 1);
  assert.deepEqual(summary.audit_urls.console_errors, ['https://a.gov/']);
});

test('buildCodeQualitySummary counts URLs with document.write failing', () => {
  const results = [
    makeUrlResult({ url: 'https://a.gov/', code_quality_audits: { no_document_write: { passing: false } } })
  ];
  const summary = buildCodeQualitySummary(results);
  assert.equal(summary.urls_with_document_write, 1);
});

test('buildCodeQualitySummary counts URLs with vulnerable libraries failing', () => {
  const results = [
    makeUrlResult({
      url: 'https://a.gov/',
      code_quality_audits: {
        vulnerable_libraries: {
          passing: false,
          items: [{ library: 'jquery', severity: 'high' }, { library: 'lodash', severity: 'medium' }]
        }
      }
    })
  ];
  const summary = buildCodeQualitySummary(results);
  assert.equal(summary.urls_with_vulnerable_libraries, 1);
  assert.equal(summary.vulnerable_library_counts.jquery.count, 1);
  assert.equal(summary.vulnerable_library_counts.jquery.severity, 'high');
  assert.equal(summary.vulnerable_library_counts.lodash.count, 1);
});

test('buildCodeQualitySummary accumulates vulnerable library counts across URLs', () => {
  const results = [
    makeUrlResult({
      url: 'https://a.gov/',
      code_quality_audits: { vulnerable_libraries: { passing: false, items: [{ library: 'jquery', severity: 'high' }] } }
    }),
    makeUrlResult({
      url: 'https://b.gov/',
      code_quality_audits: { vulnerable_libraries: { passing: false, items: [{ library: 'jquery', severity: 'high' }] } }
    })
  ];
  const summary = buildCodeQualitySummary(results);
  assert.equal(summary.vulnerable_library_counts.jquery.count, 2);
});

test('buildCodeQualitySummary counts JS libraries from js_libraries field', () => {
  const results = [
    makeUrlResult({ code_quality_audits: { js_libraries: { items: [{ name: 'React' }, { name: 'jQuery' }] } } }),
    makeUrlResult({ url: 'https://b.gov/', code_quality_audits: { js_libraries: { items: [{ name: 'React' }] } } })
  ];
  const summary = buildCodeQualitySummary(results);
  assert.equal(summary.js_library_counts.React, 2);
  assert.equal(summary.js_library_counts.jQuery, 1);
});

test('buildCodeQualitySummary ignores items without library name', () => {
  const results = [
    makeUrlResult({
      code_quality_audits: {
        vulnerable_libraries: { passing: false, items: [{ severity: 'high' }] },
        js_libraries: { items: [{ version: '1.0' }] }
      }
    })
  ];
  const summary = buildCodeQualitySummary(results);
  assert.deepEqual(summary.vulnerable_library_counts, {});
  assert.deepEqual(summary.js_library_counts, {});
});

// ---------------------------------------------------------------------------
// buildDailyReport
// ---------------------------------------------------------------------------

const MIN_SCORE_SUMMARY = {
  aggregate_scores: {
    performance: { mean_score: 80, url_count_used: 1 },
    accessibility: { mean_score: 90, url_count_used: 1 },
    best_practices: { mean_score: 85, url_count_used: 1 },
    seo: { mean_score: 88, url_count_used: 1 },
    pwa: { mean_score: 0, url_count_used: 1 }
  }
};

const MIN_WEIGHTED_IMPACT = {
  traffic_window_mode: 'daily',
  totals: { affected_share_percent: 15 }
};

const MIN_FPC_EXCLUSION = { total_page_loads: 500000, scanned_url_count: 1 };

const MIN_HISTORY_WINDOW = {
  window_days: 30,
  history_series: []
};

function buildMinReport(overrides = {}) {
  return buildDailyReport({
    runMetadata: makeRunMetadata(),
    scoreSummary: MIN_SCORE_SUMMARY,
    weightedImpact: MIN_WEIGHTED_IMPACT,
    prevalenceImpact: { categories: {} },
    fpcExclusion: MIN_FPC_EXCLUSION,
    historyWindow: MIN_HISTORY_WINDOW,
    urlResults: [],
    ...overrides
  });
}

test('buildDailyReport returns object with required top-level fields', () => {
  const report = buildMinReport();
  const requiredFields = [
    'run_date', 'run_id', 'url_limit', 'url_counts', 'aggregate_scores',
    'estimated_impact', 'fpc_exclusion', 'top_urls', 'tech_summary',
    'code_quality_summary', 'readability_summary', 'history_series',
    'trend_window_days', 'generated_at', 'report_status'
  ];
  for (const field of requiredFields) {
    assert.ok(field in report, `Report missing field: ${field}`);
  }
});

test('buildDailyReport copies run_date and run_id from runMetadata', () => {
  const report = buildMinReport();
  assert.equal(report.run_date, '2024-11-15');
  assert.equal(report.run_id, 'run-2024-11-15-abc123');
});

test('buildDailyReport url_counts reflects input url results', () => {
  const urlResults = [
    makeUrlResult({ scan_status: 'success' }),
    makeUrlResult({ url: 'https://b.gov/', scan_status: 'failed' }),
    makeUrlResult({ url: 'https://c.gov/', scan_status: 'excluded' })
  ];
  const report = buildMinReport({ urlResults });
  assert.equal(report.url_counts.processed, 3);
  assert.equal(report.url_counts.succeeded, 1);
  assert.equal(report.url_counts.failed, 1);
  assert.equal(report.url_counts.excluded, 1);
});

test('buildDailyReport aggregate_scores pulled from scoreSummary', () => {
  const report = buildMinReport();
  assert.equal(report.aggregate_scores.performance, 80);
  assert.equal(report.aggregate_scores.accessibility, 90);
  assert.equal(report.aggregate_scores.best_practices, 85);
  assert.equal(report.aggregate_scores.seo, 88);
});

test('buildDailyReport aggregate_scores default to 0 when scoreSummary is null', () => {
  const report = buildMinReport({ scoreSummary: null });
  assert.equal(report.aggregate_scores.performance, 0);
  assert.equal(report.aggregate_scores.accessibility, 0);
});

test('buildDailyReport estimated_impact uses weightedImpact traffic window mode', () => {
  const report = buildMinReport();
  assert.equal(report.estimated_impact.traffic_window_mode, 'daily');
  assert.equal(report.estimated_impact.affected_share_percent, 15);
});

test('buildDailyReport estimated_impact falls back to runMetadata traffic_window_mode when weightedImpact is null', () => {
  const report = buildMinReport({ weightedImpact: null });
  assert.equal(report.estimated_impact.traffic_window_mode, 'daily');
});

test('buildDailyReport top_urls is sorted by page_load_count descending', () => {
  const urlResults = [
    makeUrlResult({ url: 'https://a.gov/', page_load_count: 100 }),
    makeUrlResult({ url: 'https://b.gov/', page_load_count: 5000 }),
    makeUrlResult({ url: 'https://c.gov/', page_load_count: 900 })
  ];
  const report = buildMinReport({ urlResults });
  assert.equal(report.top_urls[0].url, 'https://b.gov/');
  assert.equal(report.top_urls[1].url, 'https://c.gov/');
  assert.equal(report.top_urls[2].url, 'https://a.gov/');
});

test('buildDailyReport top_urls entry has lighthouse_scores for successful scan', () => {
  const urlResults = [makeUrlResult({ scan_status: 'success', lighthouse_performance: 75 })];
  const report = buildMinReport({ urlResults });
  assert.ok(report.top_urls[0].lighthouse_scores !== null);
  assert.equal(report.top_urls[0].lighthouse_scores.performance, 75);
});

test('buildDailyReport top_urls lighthouse_scores is null for failed scan', () => {
  const urlResults = [makeUrlResult({ scan_status: 'failed' })];
  const report = buildMinReport({ urlResults });
  assert.equal(report.top_urls[0].lighthouse_scores, null);
});

test('buildDailyReport top_urls findings_count is count of axe_findings', () => {
  const urlResults = [
    makeUrlResult({
      axe_findings: [
        { id: 'color-contrast', impact: 'serious' },
        { id: 'image-alt', impact: 'critical' },
        { id: 'label', impact: 'moderate' }
      ]
    })
  ];
  const report = buildMinReport({ urlResults });
  assert.equal(report.top_urls[0].findings_count, 3);
});

test('buildDailyReport top_urls severe_findings_count only counts critical/serious', () => {
  const urlResults = [
    makeUrlResult({
      axe_findings: [
        { id: 'color-contrast', impact: 'serious' },
        { id: 'image-alt', impact: 'critical' },
        { id: 'label', impact: 'moderate' },
        { id: 'blink', impact: 'minor' }
      ]
    })
  ];
  const report = buildMinReport({ urlResults });
  assert.equal(report.top_urls[0].severe_findings_count, 2);
});

test('buildDailyReport report_status is "partial" when any URL failed', () => {
  const urlResults = [
    makeUrlResult({ scan_status: 'success' }),
    makeUrlResult({ url: 'https://b.gov/', scan_status: 'failed' })
  ];
  const report = buildMinReport({ urlResults });
  assert.equal(report.report_status, 'partial');
});

test('buildDailyReport report_status is "success" when no URLs failed', () => {
  const urlResults = [makeUrlResult({ scan_status: 'success' })];
  const report = buildMinReport({ urlResults });
  assert.equal(report.report_status, 'success');
});

test('buildDailyReport source_data_date is the latest source_date from url results', () => {
  const urlResults = [
    makeUrlResult({ source_date: '2024-11-13' }),
    makeUrlResult({ url: 'https://b.gov/', source_date: '2024-11-15' }),
    makeUrlResult({ url: 'https://c.gov/', source_date: '2024-11-14' })
  ];
  const report = buildMinReport({ urlResults });
  assert.equal(report.source_data_date, '2024-11-15');
});

test('buildDailyReport source_data_date is null when no url results have source_date', () => {
  const report = buildMinReport({ urlResults: [makeUrlResult()] });
  assert.equal(report.source_data_date, null);
});

test('buildDailyReport trend_window_days comes from historyWindow.window_days', () => {
  const report = buildMinReport({ historyWindow: { window_days: 60, history_series: [] } });
  assert.equal(report.trend_window_days, 60);
});

test('buildDailyReport history_series maps historyWindow entries to {date, aggregate_scores}', () => {
  const historyWindow = {
    window_days: 30,
    history_series: [
      { run_date: '2024-11-14', aggregate_scores: { performance: 75, accessibility: 85, best_practices: 80, seo: 82, pwa: 0 } }
    ]
  };
  const report = buildMinReport({ historyWindow });
  assert.equal(report.history_series.length, 1);
  assert.equal(report.history_series[0].date, '2024-11-14');
  assert.equal(report.history_series[0].aggregate_scores.performance, 75);
});

test('buildDailyReport fpc_exclusion is null when not provided', () => {
  const report = buildMinReport({ fpcExclusion: null });
  assert.equal(report.fpc_exclusion, null);
});

test('buildDailyReport passes fpc_exclusion through unchanged when provided', () => {
  const report = buildMinReport();
  assert.deepEqual(report.fpc_exclusion, MIN_FPC_EXCLUSION);
});
