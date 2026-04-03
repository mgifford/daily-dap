import test from 'node:test';
import assert from 'node:assert/strict';
import { createLogEvent, createWarningEvent, createErrorEvent, logProgress, logStageStart, logStageComplete } from '../../src/lib/logging.js';

// createLogEvent
test('createLogEvent returns object with expected fields', () => {
  const event = createLogEvent({ level: 'info', code: 'TEST_CODE', message: 'test message' });
  assert.ok('level' in event);
  assert.ok('code' in event);
  assert.ok('message' in event);
  assert.ok('context' in event);
  assert.ok('timestamp' in event);
});

test('createLogEvent sets level, code, and message correctly', () => {
  const event = createLogEvent({ level: 'warning', code: 'SCAN_TIMEOUT', message: 'Scan timed out' });
  assert.equal(event.level, 'warning');
  assert.equal(event.code, 'SCAN_TIMEOUT');
  assert.equal(event.message, 'Scan timed out');
});

test('createLogEvent defaults context to empty object when not provided', () => {
  const event = createLogEvent({ level: 'error', code: 'ERR', message: 'boom' });
  assert.deepEqual(event.context, {});
});

test('createLogEvent preserves provided context', () => {
  const ctx = { url: 'https://example.gov/', attempt: 2 };
  const event = createLogEvent({ level: 'error', code: 'FAIL', message: 'failed', context: ctx });
  assert.deepEqual(event.context, ctx);
});

test('createLogEvent timestamp is a valid ISO-8601 string', () => {
  const event = createLogEvent({ level: 'info', code: 'X', message: 'x' });
  const parsed = new Date(event.timestamp);
  assert.ok(!Number.isNaN(parsed.getTime()), 'timestamp should be parseable as a date');
  assert.match(event.timestamp, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
});

// createWarningEvent
test('createWarningEvent sets level to "warning"', () => {
  const event = createWarningEvent('WARN_CODE', 'a warning');
  assert.equal(event.level, 'warning');
});

test('createWarningEvent sets code and message', () => {
  const event = createWarningEvent('SCAN_SKIPPED', 'URL was skipped');
  assert.equal(event.code, 'SCAN_SKIPPED');
  assert.equal(event.message, 'URL was skipped');
});

test('createWarningEvent defaults context to empty object', () => {
  const event = createWarningEvent('W', 'msg');
  assert.deepEqual(event.context, {});
});

test('createWarningEvent accepts optional context', () => {
  const event = createWarningEvent('W', 'msg', { url: 'https://example.gov/' });
  assert.equal(event.context.url, 'https://example.gov/');
});

// createErrorEvent
test('createErrorEvent sets level to "error"', () => {
  const event = createErrorEvent('ERR_CODE', 'an error');
  assert.equal(event.level, 'error');
});

test('createErrorEvent sets code and message', () => {
  const event = createErrorEvent('LIGHTHOUSE_CRASH', 'Lighthouse crashed');
  assert.equal(event.code, 'LIGHTHOUSE_CRASH');
  assert.equal(event.message, 'Lighthouse crashed');
});

test('createErrorEvent defaults context to empty object', () => {
  const event = createErrorEvent('E', 'msg');
  assert.deepEqual(event.context, {});
});

test('createErrorEvent accepts optional context', () => {
  const event = createErrorEvent('E', 'msg', { attempt: 3, url: 'https://example.gov/' });
  assert.equal(event.context.attempt, 3);
});

// logProgress - only test that it does not throw and calls console.log
test('logProgress does not throw for valid arguments', () => {
  const original = console.log;
  const calls = [];
  console.log = (...args) => calls.push(args.join(' '));
  try {
    assert.doesNotThrow(() => logProgress('SCAN', 'Processing URL'));
  } finally {
    console.log = original;
  }
});

test('logProgress outputs stage and message', () => {
  const original = console.log;
  let output = '';
  console.log = (...args) => { output = args.join(' '); };
  try {
    logProgress('MY_STAGE', 'doing work');
    assert.ok(output.includes('MY_STAGE'), 'output should include stage name');
    assert.ok(output.includes('doing work'), 'output should include message');
  } finally {
    console.log = original;
  }
});

test('logProgress includes serialized details when provided', () => {
  const original = console.log;
  let output = '';
  console.log = (...args) => { output = args.join(' '); };
  try {
    logProgress('STAGE', 'msg', { count: 5 });
    assert.ok(output.includes('"count":5') || output.includes('"count": 5'), 'output should include details JSON');
  } finally {
    console.log = original;
  }
});

test('logProgress does not include details JSON when details is empty', () => {
  const original = console.log;
  let output = '';
  console.log = (...args) => { output = args.join(' '); };
  try {
    logProgress('STAGE', 'msg');
    assert.ok(!output.includes('{'), 'no JSON object for empty details');
  } finally {
    console.log = original;
  }
});

// logStageStart
test('logStageStart does not throw', () => {
  const original = console.log;
  console.log = () => {};
  try {
    assert.doesNotThrow(() => logStageStart('INIT'));
  } finally {
    console.log = original;
  }
});

test('logStageStart includes "Starting" in output', () => {
  const original = console.log;
  let output = '';
  console.log = (...args) => { output = args.join(' '); };
  try {
    logStageStart('INIT');
    assert.ok(output.includes('Starting'), 'output should say Starting');
  } finally {
    console.log = original;
  }
});

// logStageComplete
test('logStageComplete does not throw', () => {
  const original = console.log;
  console.log = () => {};
  try {
    assert.doesNotThrow(() => logStageComplete('SCAN'));
  } finally {
    console.log = original;
  }
});

test('logStageComplete includes "Complete" in output', () => {
  const original = console.log;
  let output = '';
  console.log = (...args) => { output = args.join(' '); };
  try {
    logStageComplete('SCAN');
    assert.ok(output.includes('Complete'), 'output should say Complete');
  } finally {
    console.log = original;
  }
});
