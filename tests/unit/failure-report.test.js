import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFailureReport, renderFailurePage } from '../../src/publish/failure-report.js';

const SAMPLE_METADATA = {
  run_date: '2024-11-15',
  run_id: 'run-2024-11-15-abc123',
  traffic_window_mode: 'rolling30',
  url_limit_requested: 20
};

// buildFailureReport tests
test('buildFailureReport returns object with expected fields', () => {
  const report = buildFailureReport({
    runMetadata: SAMPLE_METADATA,
    error: new Error('Something broke')
  });

  assert.equal(report.report_type, 'failure');
  assert.equal(report.status, 'failed');
  assert.ok('run_date' in report);
  assert.ok('run_id' in report);
  assert.ok('traffic_window_mode' in report);
  assert.ok('url_limit' in report);
  assert.ok('generated_at' in report);
  assert.ok('error' in report);
});

test('buildFailureReport copies run metadata fields correctly', () => {
  const report = buildFailureReport({
    runMetadata: SAMPLE_METADATA,
    error: new Error('oops')
  });

  assert.equal(report.run_date, '2024-11-15');
  assert.equal(report.run_id, 'run-2024-11-15-abc123');
  assert.equal(report.traffic_window_mode, 'rolling30');
  assert.equal(report.url_limit, 20);
});

test('buildFailureReport captures error message and stack', () => {
  const error = new Error('Lighthouse timed out');
  const report = buildFailureReport({ runMetadata: SAMPLE_METADATA, error });

  assert.equal(report.error.message, 'Lighthouse timed out');
  assert.equal(report.error.stack, error.stack);
});

test('buildFailureReport uses "Unknown failure" when error is null', () => {
  const report = buildFailureReport({ runMetadata: SAMPLE_METADATA, error: null });

  assert.equal(report.error.message, 'Unknown failure');
  assert.equal(report.error.stack, null);
});

test('buildFailureReport generated_at is a valid ISO-8601 timestamp', () => {
  const report = buildFailureReport({ runMetadata: SAMPLE_METADATA, error: new Error('x') });
  const parsed = new Date(report.generated_at);
  assert.ok(!Number.isNaN(parsed.getTime()));
});

// renderFailurePage tests
test('renderFailurePage returns HTML string', () => {
  const failureReport = buildFailureReport({
    runMetadata: SAMPLE_METADATA,
    error: new Error('oops')
  });
  const html = renderFailurePage(failureReport);

  assert.ok(typeof html === 'string');
  assert.ok(html.startsWith('<!doctype html>'));
});

test('renderFailurePage includes run_date in title', () => {
  const failureReport = buildFailureReport({
    runMetadata: SAMPLE_METADATA,
    error: new Error('oops')
  });
  const html = renderFailurePage(failureReport);

  assert.ok(html.includes('2024-11-15'));
});

test('renderFailurePage escapes HTML in run_date to prevent XSS', () => {
  const report = {
    run_date: '<script>alert(1)</script>',
    run_id: 'safe-id',
    error: { message: 'boom' }
  };
  const html = renderFailurePage(report);

  assert.ok(!html.includes('<script>alert(1)</script>'), 'raw script tag should not appear');
  assert.ok(html.includes('&lt;script&gt;'), 'script tag should be escaped');
});

test('renderFailurePage escapes HTML in run_id to prevent XSS', () => {
  const report = {
    run_date: '2024-11-15',
    run_id: '"><img src=x onerror=alert(1)>',
    error: { message: 'boom' }
  };
  const html = renderFailurePage(report);

  assert.ok(!html.includes('<img'), 'unescaped <img tag should not appear');
  assert.ok(html.includes('&lt;img'), 'img tag should be escaped as &lt;img');
  assert.ok(html.includes('&quot;'), 'double quote should be escaped');
});

test('renderFailurePage escapes HTML in error message to prevent XSS', () => {
  const report = {
    run_date: '2024-11-15',
    run_id: 'safe-id',
    error: { message: '<b>bold error</b> & "quoted"' }
  };
  const html = renderFailurePage(report);

  assert.ok(!html.includes('<b>bold error</b>'), 'raw tags should not appear');
  assert.ok(html.includes('&lt;b&gt;'), 'angle brackets should be escaped');
  assert.ok(html.includes('&amp;'), 'ampersand should be escaped');
  assert.ok(html.includes('&quot;'), 'double quote should be escaped');
});

test('renderFailurePage includes landmark roles for accessibility', () => {
  const failureReport = buildFailureReport({
    runMetadata: SAMPLE_METADATA,
    error: new Error('oops')
  });
  const html = renderFailurePage(failureReport);

  assert.ok(html.includes('role="banner"'));
  assert.ok(html.includes('id="main-content"'));
  assert.ok(html.includes('role="contentinfo"'));
});

test('renderFailurePage includes back-link to dashboard', () => {
  const failureReport = buildFailureReport({
    runMetadata: SAMPLE_METADATA,
    error: new Error('oops')
  });
  const html = renderFailurePage(failureReport);

  assert.ok(html.includes('../../index.html'));
});
