/**
 * Axe-core accessibility tests for generated HTML report pages.
 *
 * These tests verify that all rendered HTML pages meet WCAG 2.2 AA standards
 * by running axe-core against the output of each render function using jsdom.
 *
 * A minimal fixture report is used so that a full scan is not required to
 * test accessibility of the generated HTML.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
import {
  renderDailyReportPage,
  renderDashboardPage,
  renderCodeQualityPage,
  renderArchiveIndexPage,
  render404Page,
} from '../../src/publish/render-pages.js';
import { renderFailurePage } from '../../src/publish/failure-report.js';

// ---------------------------------------------------------------------------
// axe-core setup
// ---------------------------------------------------------------------------

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve('axe-core/axe.js'), 'utf8');

/**
 * Run axe-core accessibility checks on an HTML string.
 * Uses jsdom to create a DOM environment and injects axe-core via eval.
 *
 * @param {string} html - Full HTML document string to analyse
 * @returns {Promise<import('axe-core').AxeResults>} axe results object
 */
async function runAxe(html) {
  const dom = new JSDOM(html, { runScripts: 'dangerously' });
  const { window } = dom;
  window.eval(axeSource);

  return new Promise((resolve, reject) => {
    window.axe.run(
      window.document,
      {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      },
      (err, results) => {
        if (err) reject(err);
        else resolve(results);
      }
    );
  });
}

/**
 * Build a violation summary string suitable for assert messages.
 * @param {import('axe-core').Result[]} violations
 * @returns {string}
 */
function summariseViolations(violations) {
  return violations
    .map((v) => `  [${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} node(s))`)
    .join('\n');
}

// ---------------------------------------------------------------------------
// Minimal fixture data
// ---------------------------------------------------------------------------

/** Minimal top-URL entry used across fixtures */
const FIXTURE_TOP_URL = {
  url: 'https://example.gov',
  page_load_count: 100000,
  scan_status: 'success',
  failure_reason: null,
  findings_count: 2,
  severe_findings_count: 1,
  core_web_vitals_status: 'poor',
  lighthouse_scores: {
    performance: 55,
    accessibility: 84,
    best_practices: 87,
    seo: 88,
    pwa: 0,
  },
  axe_findings: [
    {
      id: 'color-contrast',
      title: 'Elements must have sufficient color contrast',
      description: 'Ensures the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds.',
      score: 0,
      tags: ['wcag2aa', 'wcag143'],
      items: [
        {
          selector: 'p.low-contrast',
          snippet: '<p class="low-contrast">',
          node_label: 'Low contrast text',
          explanation: 'Fix any of the following:\n  Element has insufficient color contrast',
        },
      ],
    },
  ],
};

/** Minimal daily report fixture */
const FIXTURE_REPORT = {
  run_date: '2026-01-15',
  run_id: 'run-2026-01-15-test',
  url_counts: { processed: 1, succeeded: 1, failed: 0, excluded: 0 },
  aggregate_scores: {
    performance: 55,
    accessibility: 84,
    best_practices: 87,
    seo: 88,
    pwa: 0,
  },
  estimated_impact: {
    traffic_window_mode: 'daily',
    affected_share_percent: 10,
    categories: [],
  },
  history_series: [
    {
      date: '2026-01-14',
      aggregate_scores: {
        performance: 50,
        accessibility: 82,
        best_practices: 85,
        seo: 86,
        pwa: 0,
      },
    },
    {
      date: '2026-01-15',
      aggregate_scores: {
        performance: 55,
        accessibility: 84,
        best_practices: 87,
        seo: 88,
        pwa: 0,
      },
    },
  ],
  top_urls: [FIXTURE_TOP_URL],
  generated_at: '2026-01-15T09:00:00.000Z',
  report_status: 'success',
  tech_summary: null,
  code_quality_summary: null,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('renderDailyReportPage HTML has no WCAG 2.2 AA violations', async () => {
  const html = renderDailyReportPage(FIXTURE_REPORT);
  const results = await runAxe(html);
  assert.equal(
    results.violations.length,
    0,
    `Expected no axe violations in renderDailyReportPage output but found ${results.violations.length}:\n${summariseViolations(results.violations)}`
  );
});

test('renderDashboardPage HTML has no WCAG 2.2 AA violations', async () => {
  const html = renderDashboardPage({
    latestReport: FIXTURE_REPORT,
    historyIndex: [
      { run_date: '2026-01-15', run_id: 'run-2026-01-15-test' },
      { run_date: '2026-01-14', run_id: 'run-2026-01-14-test' },
    ],
    archiveUrl: null,
    archiveWindowDays: 14,
  });
  const results = await runAxe(html);
  assert.equal(
    results.violations.length,
    0,
    `Expected no axe violations in renderDashboardPage output but found ${results.violations.length}:\n${summariseViolations(results.violations)}`
  );
});

test('renderCodeQualityPage HTML has no WCAG 2.2 AA violations', async () => {
  const reportWithCodeQuality = {
    ...FIXTURE_REPORT,
    code_quality_summary: {
      total_scanned: 1,
      urls_with_deprecated_apis: 0,
      urls_with_console_errors: 0,
      urls_with_no_document_write: 1,
      urls_with_vulnerable_libraries: 0,
      js_library_counts: { jQuery: 1 },
      vulnerable_library_counts: {},
    },
  };
  const html = renderCodeQualityPage(reportWithCodeQuality);
  const results = await runAxe(html);
  assert.equal(
    results.violations.length,
    0,
    `Expected no axe violations in renderCodeQualityPage output but found ${results.violations.length}:\n${summariseViolations(results.violations)}`
  );
});

test('renderArchiveIndexPage HTML has no WCAG 2.2 AA violations', async () => {
  const html = renderArchiveIndexPage({
    entries: [
      {
        run_date: '2026-01-15',
        run_id: 'run-2026-01-15-test',
        archive_url: 'https://example.com/archive/2026-01-15.zip',
      },
    ],
    generatedAt: '2026-01-15T10:00:00.000Z',
    displayDays: 14,
  });
  const results = await runAxe(html);
  assert.equal(
    results.violations.length,
    0,
    `Expected no axe violations in renderArchiveIndexPage output but found ${results.violations.length}:\n${summariseViolations(results.violations)}`
  );
});

test('render404Page HTML has no WCAG 2.2 AA violations', async () => {
  const html = render404Page();
  const results = await runAxe(html);
  assert.equal(
    results.violations.length,
    0,
    `Expected no axe violations in render404Page output but found ${results.violations.length}:\n${summariseViolations(results.violations)}`
  );
});

test('renderFailurePage HTML has no WCAG 2.2 AA violations', async () => {
  const html = renderFailurePage({
    run_date: '2026-01-15',
    run_id: 'run-2026-01-15-test',
    error: 'Scan timed out after 30 minutes',
    generated_at: '2026-01-15T09:30:00.000Z',
  });
  const results = await runAxe(html);
  assert.equal(
    results.violations.length,
    0,
    `Expected no axe violations in renderFailurePage output but found ${results.violations.length}:\n${summariseViolations(results.violations)}`
  );
});

test('renderDashboardPage with no history HTML has no WCAG 2.2 AA violations', async () => {
  const html = renderDashboardPage({
    latestReport: null,
    historyIndex: [],
    archiveUrl: null,
    archiveWindowDays: 14,
  });
  const results = await runAxe(html);
  assert.equal(
    results.violations.length,
    0,
    `Expected no axe violations in empty renderDashboardPage output but found ${results.violations.length}:\n${summariseViolations(results.violations)}`
  );
});
