import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSeverity, extractIssues, normalizeFinding } from '../../src/scanners/scangov-runner.js';

// normalizeSeverity tests
test('normalizeSeverity returns critical for "critical"', () => {
  assert.equal(normalizeSeverity('critical'), 'critical');
});

test('normalizeSeverity returns serious for "serious"', () => {
  assert.equal(normalizeSeverity('serious'), 'serious');
});

test('normalizeSeverity returns moderate for "moderate"', () => {
  assert.equal(normalizeSeverity('moderate'), 'moderate');
});

test('normalizeSeverity returns minor for "minor"', () => {
  assert.equal(normalizeSeverity('minor'), 'minor');
});

test('normalizeSeverity normalizes uppercase to lowercase', () => {
  assert.equal(normalizeSeverity('CRITICAL'), 'critical');
  assert.equal(normalizeSeverity('Serious'), 'serious');
});

test('normalizeSeverity trims whitespace before normalizing', () => {
  assert.equal(normalizeSeverity('  critical  '), 'critical');
});

test('normalizeSeverity returns unknown for unrecognized string', () => {
  assert.equal(normalizeSeverity('high'), 'unknown');
  assert.equal(normalizeSeverity('warning'), 'unknown');
});

test('normalizeSeverity returns unknown for null', () => {
  assert.equal(normalizeSeverity(null), 'unknown');
});

test('normalizeSeverity returns unknown for undefined', () => {
  assert.equal(normalizeSeverity(undefined), 'unknown');
});

test('normalizeSeverity returns unknown for non-string input', () => {
  assert.equal(normalizeSeverity(3), 'unknown');
  assert.equal(normalizeSeverity({}), 'unknown');
});

// extractIssues tests
test('extractIssues returns array as-is when rawResult is an array', () => {
  const arr = [{ code: 'a' }, { code: 'b' }];
  const issues = extractIssues(arr);
  assert.deepEqual(issues, arr);
});

test('extractIssues returns rawResult.issues when it is an array', () => {
  const issues = [{ code: 'a' }];
  const result = extractIssues({ issues });
  assert.deepEqual(result, issues);
});

test('extractIssues returns rawResult.findings when issues is absent', () => {
  const findings = [{ code: 'b' }];
  const result = extractIssues({ findings });
  assert.deepEqual(result, findings);
});

test('extractIssues returns empty array for null input', () => {
  assert.deepEqual(extractIssues(null), []);
});

test('extractIssues returns empty array for undefined input', () => {
  assert.deepEqual(extractIssues(undefined), []);
});

test('extractIssues returns empty array when no known shape matches', () => {
  assert.deepEqual(extractIssues({ other: 'data' }), []);
});

test('extractIssues prefers .issues over .findings when both are present', () => {
  const issues = [{ code: 'from-issues' }];
  const findings = [{ code: 'from-findings' }];
  const result = extractIssues({ issues, findings });
  assert.deepEqual(result, issues);
});

// normalizeFinding tests
test('normalizeFinding maps basic issue fields', () => {
  const finding = normalizeFinding('https://example.gov', {
    code: 'color-contrast',
    category: 'accessibility',
    severity: 'serious',
    message: 'Text has insufficient contrast',
    selector: '.main-heading'
  });

  assert.equal(finding.url, 'https://example.gov');
  assert.equal(finding.issue_code, 'color-contrast');
  assert.equal(finding.issue_category, 'accessibility');
  assert.equal(finding.severity, 'serious');
  assert.equal(finding.message, 'Text has insufficient contrast');
  assert.equal(finding.selector_or_location, '.main-heading');
  assert.equal(finding.source_tool, 'scangov');
});

test('normalizeFinding falls back to issue.id when code is absent', () => {
  const finding = normalizeFinding('https://example.gov', { id: 'aria-label', severity: 'minor' });
  assert.equal(finding.issue_code, 'aria-label');
});

test('normalizeFinding falls back to issue.rule_id when code and id are absent', () => {
  const finding = normalizeFinding('https://example.gov', { rule_id: 'heading-order', severity: 'moderate' });
  assert.equal(finding.issue_code, 'heading-order');
});

test('normalizeFinding defaults issue_code to "unknown_issue" when no code field exists', () => {
  const finding = normalizeFinding('https://example.gov', { severity: 'minor' });
  assert.equal(finding.issue_code, 'unknown_issue');
});

test('normalizeFinding uses issue.impact as severity fallback', () => {
  const finding = normalizeFinding('https://example.gov', { code: 'x', impact: 'critical' });
  assert.equal(finding.severity, 'critical');
});

test('normalizeFinding sets selector_or_location to null when absent', () => {
  const finding = normalizeFinding('https://example.gov', { code: 'x' });
  assert.equal(finding.selector_or_location, null);
});

test('normalizeFinding uses issue.location when selector is absent', () => {
  const finding = normalizeFinding('https://example.gov', { code: 'x', location: 'header nav' });
  assert.equal(finding.selector_or_location, 'header nav');
});

test('normalizeFinding defaults message to "No message provided" when absent', () => {
  const finding = normalizeFinding('https://example.gov', { code: 'x' });
  assert.equal(finding.message, 'No message provided');
});

// createHttpRunImpl tests
import { createHttpRunImpl } from '../../src/scanners/scangov-runner.js';
import { mock } from 'node:test';

test('createHttpRunImpl returns a function', () => {
  const runImpl = createHttpRunImpl('https://api.example.gov/scan');
  assert.equal(typeof runImpl, 'function');
});

test('createHttpRunImpl sends GET request with url query param', async (t) => {
  const captured = {};
  t.mock.method(globalThis, 'fetch', async (url, opts) => {
    captured.url = url.toString();
    captured.opts = opts;
    return {
      ok: true,
      json: async () => ({ issues: [{ code: 'color-contrast', severity: 'serious' }] })
    };
  });

  const runImpl = createHttpRunImpl('https://api.example.gov/scan');
  const result = await runImpl('https://www.example.gov/');

  assert.ok(captured.url.startsWith('https://api.example.gov/scan?'));
  assert.ok(captured.url.includes(encodeURIComponent('https://www.example.gov/')));
  assert.ok(captured.opts?.signal instanceof AbortSignal, 'signal should be an AbortSignal');
  assert.deepEqual(result, { issues: [{ code: 'color-contrast', severity: 'serious' }] });
});

test('createHttpRunImpl throws on non-ok HTTP response', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => ({
    ok: false,
    status: 503,
    statusText: 'Service Unavailable'
  }));

  const runImpl = createHttpRunImpl('https://api.example.gov/scan');
  await assert.rejects(
    () => runImpl('https://www.example.gov/'),
    /503/
  );
});

test('createHttpRunImpl sets Accept: application/json header', async (t) => {
  let capturedHeaders;
  t.mock.method(globalThis, 'fetch', async (_url, opts) => {
    capturedHeaders = opts?.headers ?? {};
    return { ok: true, json: async () => ({ issues: [] }) };
  });

  const runImpl = createHttpRunImpl('https://api.example.gov/scan');
  await runImpl('https://www.example.gov/');

  assert.equal(capturedHeaders['Accept'], 'application/json');
});
