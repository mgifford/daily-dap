import test from 'node:test';
import assert from 'node:assert/strict';
import { roundToTwo, normalizeTraffic } from '../../src/lib/math-utils.js';

// roundToTwo

test('roundToTwo rounds to two decimal places', () => {
  assert.equal(roundToTwo(1.234), 1.23);
  assert.equal(roundToTwo(1.235), 1.24);
  assert.equal(roundToTwo(0), 0);
  assert.equal(roundToTwo(100), 100);
  assert.equal(roundToTwo(1.2), 1.2);
});

test('roundToTwo handles negative values', () => {
  assert.equal(roundToTwo(-1.005), -1);
  assert.equal(roundToTwo(-1.234), -1.23);
});

test('roundToTwo returns whole numbers unchanged when they have no decimal part', () => {
  assert.equal(roundToTwo(5), 5);
  assert.equal(roundToTwo(42), 42);
});

// normalizeTraffic

test('normalizeTraffic returns the value for a valid non-negative number', () => {
  assert.equal(normalizeTraffic(0), 0);
  assert.equal(normalizeTraffic(1000), 1000);
  assert.equal(normalizeTraffic(1.5), 1.5);
});

test('normalizeTraffic returns 0 for negative numbers', () => {
  assert.equal(normalizeTraffic(-1), 0);
  assert.equal(normalizeTraffic(-100), 0);
});

test('normalizeTraffic returns 0 for NaN', () => {
  assert.equal(normalizeTraffic(NaN), 0);
});

test('normalizeTraffic returns 0 for non-number types', () => {
  assert.equal(normalizeTraffic(null), 0);
  assert.equal(normalizeTraffic(undefined), 0);
  assert.equal(normalizeTraffic('1000'), 0);
  assert.equal(normalizeTraffic({}), 0);
});
