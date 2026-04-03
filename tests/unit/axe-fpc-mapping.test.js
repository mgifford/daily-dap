import test from 'node:test';
import assert from 'node:assert/strict';
import { FPC_LABELS, FPC_DESCRIPTIONS, FPC_SVGS, AXE_TO_FPC } from '../../src/data/axe-fpc-mapping.js';

const EXPECTED_FPC_CODES = ['WV', 'LV', 'WPC', 'WH', 'LH', 'WS', 'LM', 'LRS', 'LLCLA'];

// FPC_LABELS
test('FPC_LABELS contains all nine FPC codes', () => {
  for (const code of EXPECTED_FPC_CODES) {
    assert.ok(code in FPC_LABELS, `FPC_LABELS missing code: ${code}`);
  }
});

test('FPC_LABELS values are non-empty strings', () => {
  for (const [code, label] of Object.entries(FPC_LABELS)) {
    assert.equal(typeof label, 'string', `FPC_LABELS[${code}] should be a string`);
    assert.ok(label.length > 0, `FPC_LABELS[${code}] should not be empty`);
  }
});

test('FPC_LABELS has no extra or missing codes', () => {
  const keys = Object.keys(FPC_LABELS);
  assert.equal(keys.length, EXPECTED_FPC_CODES.length);
  for (const code of keys) {
    assert.ok(EXPECTED_FPC_CODES.includes(code), `Unexpected FPC code in FPC_LABELS: ${code}`);
  }
});

test('FPC_LABELS WV label is "Without Vision"', () => {
  assert.equal(FPC_LABELS.WV, 'Without Vision');
});

test('FPC_LABELS LLCLA label mentions Language, Cognitive, and Learning', () => {
  assert.ok(FPC_LABELS.LLCLA.includes('Language') && FPC_LABELS.LLCLA.includes('Cognitive') && FPC_LABELS.LLCLA.includes('Learning'));
});

// FPC_DESCRIPTIONS
test('FPC_DESCRIPTIONS contains all nine FPC codes', () => {
  for (const code of EXPECTED_FPC_CODES) {
    assert.ok(code in FPC_DESCRIPTIONS, `FPC_DESCRIPTIONS missing code: ${code}`);
  }
});

test('FPC_DESCRIPTIONS values are non-empty strings', () => {
  for (const [code, desc] of Object.entries(FPC_DESCRIPTIONS)) {
    assert.equal(typeof desc, 'string', `FPC_DESCRIPTIONS[${code}] should be a string`);
    assert.ok(desc.length > 0, `FPC_DESCRIPTIONS[${code}] should not be empty`);
  }
});

test('FPC_DESCRIPTIONS has exactly nine entries', () => {
  assert.equal(Object.keys(FPC_DESCRIPTIONS).length, EXPECTED_FPC_CODES.length);
});

// FPC_SVGS
test('FPC_SVGS contains all nine FPC codes', () => {
  for (const code of EXPECTED_FPC_CODES) {
    assert.ok(code in FPC_SVGS, `FPC_SVGS missing code: ${code}`);
  }
});

test('FPC_SVGS values are non-empty strings starting with <svg', () => {
  for (const [code, svg] of Object.entries(FPC_SVGS)) {
    assert.equal(typeof svg, 'string', `FPC_SVGS[${code}] should be a string`);
    assert.ok(svg.trimStart().startsWith('<svg'), `FPC_SVGS[${code}] should start with <svg`);
  }
});

test('FPC_SVGS each SVG has a closing </svg> tag', () => {
  for (const [code, svg] of Object.entries(FPC_SVGS)) {
    assert.ok(svg.includes('</svg>'), `FPC_SVGS[${code}] missing closing </svg>`);
  }
});

test('FPC_SVGS each SVG includes role="img" for accessibility', () => {
  for (const [code, svg] of Object.entries(FPC_SVGS)) {
    assert.ok(svg.includes('role="img"'), `FPC_SVGS[${code}] missing role="img"`);
  }
});

test('FPC_SVGS each SVG includes an aria-label attribute', () => {
  for (const [code, svg] of Object.entries(FPC_SVGS)) {
    assert.ok(svg.includes('aria-label='), `FPC_SVGS[${code}] missing aria-label`);
  }
});

test('FPC_SVGS each SVG includes a <title> element', () => {
  for (const [code, svg] of Object.entries(FPC_SVGS)) {
    assert.ok(svg.includes('<title>'), `FPC_SVGS[${code}] missing <title> element`);
  }
});

test('FPC_SVGS each SVG includes a <desc> element', () => {
  for (const [code, svg] of Object.entries(FPC_SVGS)) {
    assert.ok(svg.includes('<desc>'), `FPC_SVGS[${code}] missing <desc> element`);
  }
});

test('FPC_SVGS has exactly nine entries', () => {
  assert.equal(Object.keys(FPC_SVGS).length, EXPECTED_FPC_CODES.length);
});

// AXE_TO_FPC
test('AXE_TO_FPC is a Map', () => {
  assert.ok(AXE_TO_FPC instanceof Map);
});

test('AXE_TO_FPC has entries', () => {
  assert.ok(AXE_TO_FPC.size > 0, 'AXE_TO_FPC should not be empty');
});

test('AXE_TO_FPC values are non-empty arrays', () => {
  for (const [ruleId, codes] of AXE_TO_FPC) {
    assert.ok(Array.isArray(codes), `AXE_TO_FPC[${ruleId}] should be an array`);
    assert.ok(codes.length > 0, `AXE_TO_FPC[${ruleId}] should not be empty`);
  }
});

test('AXE_TO_FPC values only contain valid FPC codes', () => {
  for (const [ruleId, codes] of AXE_TO_FPC) {
    for (const code of codes) {
      assert.ok(EXPECTED_FPC_CODES.includes(code), `AXE_TO_FPC[${ruleId}] contains unknown FPC code: ${code}`);
    }
  }
});

test('AXE_TO_FPC contains known high-impact rules', () => {
  assert.ok(AXE_TO_FPC.has('color-contrast'), 'should have color-contrast');
  assert.ok(AXE_TO_FPC.has('image-alt'), 'should have image-alt');
  assert.ok(AXE_TO_FPC.has('label'), 'should have label');
  assert.ok(AXE_TO_FPC.has('document-title'), 'should have document-title');
});

test('AXE_TO_FPC color-contrast maps to LV and WPC', () => {
  const codes = AXE_TO_FPC.get('color-contrast');
  assert.ok(codes.includes('LV'), 'color-contrast should affect Limited Vision');
  assert.ok(codes.includes('WPC'), 'color-contrast should affect Without Perception of Color');
});

test('AXE_TO_FPC image-alt maps to WV', () => {
  const codes = AXE_TO_FPC.get('image-alt');
  assert.ok(codes.includes('WV'), 'image-alt should affect Without Vision');
});

test('AXE_TO_FPC values contain no duplicate codes per rule', () => {
  for (const [ruleId, codes] of AXE_TO_FPC) {
    const unique = new Set(codes);
    assert.equal(unique.size, codes.length, `AXE_TO_FPC[${ruleId}] has duplicate FPC codes`);
  }
});
