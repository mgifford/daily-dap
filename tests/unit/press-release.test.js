import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPressRelease, generatePressRelease } from '../../src/cli/generate-press-release.js';

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

const SAMPLE_REPORT = {
  run_date: '2026-03-20',
  run_id: 'run-2026-03-20-test',
  url_counts: { processed: 10, succeeded: 9, failed: 1, excluded: 0 },
  aggregate_scores: { performance: 65, accessibility: 87, best_practices: 85, seo: 88, pwa: 0 },
  fpc_exclusion: {
    total_page_loads: 500000,
    scanned_url_count: 9,
    categories: {
      WV: { label: 'Without Vision', prevalence_rate: 0.01, affected_page_loads: 300000, estimated_excluded_users: 3000 },
      LV: { label: 'Limited Vision', prevalence_rate: 0.024, affected_page_loads: 300000, estimated_excluded_users: 7200 },
      WPC: { label: 'Without Perception of Color', prevalence_rate: 0.043, affected_page_loads: 200000, estimated_excluded_users: 8600 },
      WH: { label: 'Without Hearing', prevalence_rate: 0.0033, affected_page_loads: 0, estimated_excluded_users: 0 },
      LH: { label: 'Limited Hearing', prevalence_rate: 0.035, affected_page_loads: 0, estimated_excluded_users: 0 },
      WS: { label: 'Without Speech', prevalence_rate: 0.005, affected_page_loads: 0, estimated_excluded_users: 0 },
      LM: { label: 'Limited Manipulation', prevalence_rate: 0.022, affected_page_loads: 0, estimated_excluded_users: 0 },
      LRS: { label: 'Limited Reach and Strength', prevalence_rate: 0.058, affected_page_loads: 0, estimated_excluded_users: 0 },
      LLCLA: { label: 'Limited Language, Cognitive, and Learning Abilities', prevalence_rate: 0.047, affected_page_loads: 0, estimated_excluded_users: 0 }
    }
  },
  history_series: [],
  top_urls: [
    {
      url: 'https://example.gov/',
      page_load_count: 300000,
      scan_status: 'success',
      axe_findings: [
        { id: 'color-contrast', title: 'Background and foreground colors do not have a sufficient contrast ratio.', impact: 'serious', items: [] },
        { id: 'image-alt', title: 'Image elements do not have [alt] attributes.', impact: 'critical', items: [] }
      ]
    },
    {
      url: 'https://another.gov/',
      page_load_count: 200000,
      scan_status: 'success',
      axe_findings: [
        { id: 'color-contrast', title: 'Background and foreground colors do not have a sufficient contrast ratio.', impact: 'serious', items: [] }
      ]
    }
  ],
  generated_at: '2026-03-20T09:00:00.000Z',
  report_status: 'partial'
};

const SAMPLE_AXE_DATA = {
  run_date: '2026-03-20',
  total_urls: 10,
  total_findings: 3,
  urls: [
    {
      url: 'https://example.gov/',
      scan_status: 'success',
      axe_findings_count: 2,
      axe_findings: [
        { id: 'color-contrast', title: 'Background and foreground colors do not have a sufficient contrast ratio.', impact: 'serious', items: [] },
        { id: 'image-alt', title: 'Image elements do not have [alt] attributes.', impact: 'critical', items: [] }
      ]
    },
    {
      url: 'https://another.gov/',
      scan_status: 'success',
      axe_findings_count: 1,
      axe_findings: [
        { id: 'color-contrast', title: 'Background and foreground colors do not have a sufficient contrast ratio.', impact: 'serious', items: [] }
      ]
    }
  ]
};

// ---------------------------------------------------------------------------
// buildPressRelease tests
// ---------------------------------------------------------------------------

test('buildPressRelease includes FOR IMMEDIATE RELEASE header', () => {
  const result = buildPressRelease(SAMPLE_REPORT, SAMPLE_AXE_DATA);
  assert.ok(result.includes('FOR IMMEDIATE RELEASE'), 'Should include press release header');
});

test('buildPressRelease includes the run date in title', () => {
  const result = buildPressRelease(SAMPLE_REPORT, SAMPLE_AXE_DATA);
  assert.ok(result.includes('2026-03-20') || result.includes('March 20, 2026'), 'Should include run date');
});

test('buildPressRelease includes Americans Being Left Out section', () => {
  const result = buildPressRelease(SAMPLE_REPORT, SAMPLE_AXE_DATA);
  assert.ok(result.includes('Americans Being Left Out'), 'Should have FPC exclusion section heading');
});

test('buildPressRelease includes FPC disability labels', () => {
  const result = buildPressRelease(SAMPLE_REPORT, SAMPLE_AXE_DATA);
  assert.ok(result.includes('Without Vision'), 'Should include Without Vision label');
  assert.ok(result.includes('Limited Vision'), 'Should include Limited Vision label');
  assert.ok(result.includes('Without Perception of Color'), 'Should include WPC label');
});

test('buildPressRelease does not show FPC categories with zero affected page loads', () => {
  const result = buildPressRelease(SAMPLE_REPORT, SAMPLE_AXE_DATA);
  // WH, LH, WS, LM, LRS, LLCLA all have 0 affected page loads
  assert.ok(!result.includes('Without Hearing'), 'Should not show zero-impact categories');
  assert.ok(!result.includes('Limited Hearing'), 'Should not show zero-impact categories');
});

test('buildPressRelease includes Top Accessibility Barriers section', () => {
  const result = buildPressRelease(SAMPLE_REPORT, SAMPLE_AXE_DATA);
  assert.ok(result.includes('Top Accessibility Barriers'), 'Should have barriers section');
});

test('buildPressRelease includes top axe rule IDs', () => {
  const result = buildPressRelease(SAMPLE_REPORT, SAMPLE_AXE_DATA);
  assert.ok(result.includes('color-contrast'), 'Should include most common axe rule ID');
  assert.ok(result.includes('image-alt'), 'Should include second most common axe rule ID');
});

test('buildPressRelease includes human impact narratives from axe-impact-rules.yaml', () => {
  const result = buildPressRelease(SAMPLE_REPORT, SAMPLE_AXE_DATA);
  // color-contrast has a narrative in axe-impact-rules.yaml
  // it should include "why_it_matters" text and affected demographics
  assert.ok(result.includes('Affected groups:'), 'Should include affected groups label');
});

test('buildPressRelease includes Accessibility Scores section', () => {
  const result = buildPressRelease(SAMPLE_REPORT, SAMPLE_AXE_DATA);
  assert.ok(result.includes('Accessibility Scores'), 'Should have scores section');
  assert.ok(result.includes('87'), 'Should include accessibility score value');
  assert.ok(result.includes('65'), 'Should include performance score value');
});

test('buildPressRelease includes About This Report section', () => {
  const result = buildPressRelease(SAMPLE_REPORT, SAMPLE_AXE_DATA);
  assert.ok(result.includes('About This Report'), 'Should have about section');
  assert.ok(result.includes('Digital Analytics Program'), 'Should mention DAP');
});

test('buildPressRelease includes links to report artifacts', () => {
  const result = buildPressRelease(SAMPLE_REPORT, SAMPLE_AXE_DATA);
  assert.ok(result.includes('2026-03-20/index.html'), 'Should link to full report');
  assert.ok(result.includes('axe-findings.json'), 'Should link to JSON findings');
  assert.ok(result.includes('axe-findings.csv'), 'Should link to CSV findings');
});

test('buildPressRelease uses only ASCII characters (no smart quotes or em dashes)', () => {
  const result = buildPressRelease(SAMPLE_REPORT, SAMPLE_AXE_DATA);
  // Check for smart quotes (Unicode curly quotes) and em dashes
  assert.ok(!/[\u2018\u2019\u201C\u201D\u2013\u2014]/.test(result), 'Should not contain smart quotes or em dashes');
  // Verify expected ASCII punctuation alternatives are present
  assert.ok(result.includes("'"), 'Should use straight apostrophes instead of curly quotes');
  assert.ok(result.includes('--'), 'Should use double hyphen instead of em dash');
});

test('buildPressRelease handles empty fpc_exclusion gracefully', () => {
  const reportNofpc = { ...SAMPLE_REPORT, fpc_exclusion: null };
  const result = buildPressRelease(reportNofpc, SAMPLE_AXE_DATA);
  assert.ok(result.includes('FOR IMMEDIATE RELEASE'), 'Should still generate press release without FPC data');
  assert.ok(!result.includes('Americans Being Left Out'), 'Should omit FPC section when no data');
});

test('buildPressRelease handles empty axe findings gracefully', () => {
  const emptyAxe = { ...SAMPLE_AXE_DATA, urls: [], total_findings: 0 };
  const result = buildPressRelease(SAMPLE_REPORT, emptyAxe);
  assert.ok(result.includes('FOR IMMEDIATE RELEASE'), 'Should still generate press release without findings');
});

test('buildPressRelease respects topN option', () => {
  const result = buildPressRelease(SAMPLE_REPORT, SAMPLE_AXE_DATA, { topN: 1 });
  // Only color-contrast should appear (most common), not image-alt
  assert.ok(result.includes('color-contrast'), 'Should include top rule');
  // With topN=1, only one "### N." header should appear in barriers section
  const BARRIER_SECTION_HEADING = /###\s+\d+\./g;
  const barrierMatches = [...result.matchAll(BARRIER_SECTION_HEADING)];
  assert.equal(barrierMatches.length, 1, 'Should show only 1 barrier when topN=1');
});

// ---------------------------------------------------------------------------
// generatePressRelease integration tests
// ---------------------------------------------------------------------------

async function buildTempWorkspace(options = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dap-press-release-test-'));
  const reportsRoot = path.join(root, 'docs', 'reports');
  const dailyDir = path.join(reportsRoot, 'daily', '2026-03-20');
  await fs.mkdir(dailyDir, { recursive: true });

  const report = options.report ?? SAMPLE_REPORT;
  const axeData = options.axeData ?? SAMPLE_AXE_DATA;
  const history = options.history ?? {
    generated_at: '2026-03-20T09:00:00.000Z',
    lookback_days: 31,
    entries: [
      {
        run_date: '2026-03-20',
        run_id: 'run-2026-03-20-test',
        report_path: 'daily/2026-03-20/report.json',
        page_path: 'daily/2026-03-20/index.html',
        generated_at: '2026-03-20T09:00:00.000Z'
      }
    ]
  };

  await fs.writeFile(path.join(reportsRoot, 'history.json'), JSON.stringify(history, null, 2), 'utf8');
  await fs.writeFile(path.join(dailyDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
  await fs.writeFile(path.join(dailyDir, 'axe-findings.json'), JSON.stringify(axeData, null, 2), 'utf8');

  return root;
}

test('generatePressRelease returns markdown and outputPath', async () => {
  const root = await buildTempWorkspace();
  const { markdown, outputPath } = await generatePressRelease(root, '2026-03-20');

  assert.ok(typeof markdown === 'string', 'markdown should be a string');
  assert.ok(markdown.includes('FOR IMMEDIATE RELEASE'), 'markdown should be a press release');
  assert.ok(outputPath.endsWith('press-release.md'), 'outputPath should point to press-release.md');
});

test('generatePressRelease uses history.json when no date provided', async () => {
  const root = await buildTempWorkspace();
  const { markdown } = await generatePressRelease(root, null);

  assert.ok(markdown.includes('2026-03-20') || markdown.includes('March 20, 2026'), 'Should use date from history.json');
});

test('generatePressRelease throws when no date available', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dap-press-release-test-empty-'));
  const reportsRoot = path.join(root, 'docs', 'reports');
  await fs.mkdir(reportsRoot, { recursive: true });
  const emptyHistory = { entries: [] };
  await fs.writeFile(path.join(reportsRoot, 'history.json'), JSON.stringify(emptyHistory, null, 2), 'utf8');

  await assert.rejects(
    () => generatePressRelease(root, null),
    /Could not determine report date/
  );
});
