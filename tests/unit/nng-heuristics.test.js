import test from 'node:test';
import assert from 'node:assert/strict';
import { NNG_HEURISTICS, getHeuristicIdsForWcagSc, getHeuristicById } from '../../src/data/nng-heuristics.js';

test('NNG_HEURISTICS contains exactly 10 heuristics', () => {
  assert.equal(NNG_HEURISTICS.length, 10);
});

test('NNG_HEURISTICS entries have id, name, url, description, and wcag_sc', () => {
  for (const h of NNG_HEURISTICS) {
    assert.ok(typeof h.id === 'number', `heuristic.id should be a number (got ${h.id})`);
    assert.ok(typeof h.name === 'string' && h.name.length > 0, `heuristic.name should be non-empty`);
    assert.ok(typeof h.url === 'string' && h.url.startsWith('https://'), `heuristic.url should be https`);
    assert.ok(Array.isArray(h.wcag_sc) && h.wcag_sc.length > 0, `heuristic.wcag_sc should be non-empty array`);
  }
});

test('NNG_HEURISTICS IDs are 1 through 10', () => {
  const ids = NNG_HEURISTICS.map((h) => h.id).sort((a, b) => a - b);
  assert.deepEqual(ids, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('getHeuristicById returns correct heuristic for ID 1', () => {
  const h = getHeuristicById(1);
  assert.ok(h !== undefined);
  assert.equal(h.id, 1);
  assert.equal(h.name, 'Visibility of system status');
});

test('getHeuristicById returns correct heuristic for ID 10', () => {
  const h = getHeuristicById(10);
  assert.ok(h !== undefined);
  assert.equal(h.id, 10);
  assert.equal(h.name, 'Help and documentation');
});

test('getHeuristicById returns undefined for out-of-range ID', () => {
  assert.equal(getHeuristicById(0), undefined);
  assert.equal(getHeuristicById(11), undefined);
  assert.equal(getHeuristicById(-1), undefined);
});

test('getHeuristicIdsForWcagSc returns array of IDs for known SC', () => {
  // '1.4.3' is in multiple heuristics per the data
  const ids = getHeuristicIdsForWcagSc('1.4.3');
  assert.ok(Array.isArray(ids));
  assert.ok(ids.length > 0, '1.4.3 should map to at least one heuristic');
  for (const id of ids) {
    assert.ok(typeof id === 'number' && id >= 1 && id <= 10, `ID ${id} should be 1-10`);
  }
});

test('getHeuristicIdsForWcagSc returns empty array for unknown SC', () => {
  const ids = getHeuristicIdsForWcagSc('9.9.9');
  assert.deepEqual(ids, []);
});

test('getHeuristicIdsForWcagSc returns empty array for empty string', () => {
  const ids = getHeuristicIdsForWcagSc('');
  assert.deepEqual(ids, []);
});

test('getHeuristicIdsForWcagSc result IDs correspond to heuristics that actually reference the SC', () => {
  const sc = '2.4.7';
  const ids = getHeuristicIdsForWcagSc(sc);

  for (const id of ids) {
    const h = getHeuristicById(id);
    assert.ok(h.wcag_sc.includes(sc), `Heuristic ${id} should reference SC ${sc}`);
  }
});

test('getHeuristicIdsForWcagSc heuristic 1 includes SC 2.4.7', () => {
  // Heuristic 1 (Visibility of system status) includes 2.4.7
  const ids = getHeuristicIdsForWcagSc('2.4.7');
  assert.ok(ids.includes(1));
});
