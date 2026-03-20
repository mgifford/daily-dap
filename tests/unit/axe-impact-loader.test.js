import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAxeImpactRules,
  getAxeImpactRuleMap,
  getPolicyNarrative,
  getTechnicalSummary,
  getAxeImpactMetadata,
  isAxeImpactDataStale
} from '../../src/data/axe-impact-loader.js';

test('getAxeImpactMetadata returns metadata with required fields', () => {
  const metadata = getAxeImpactMetadata();

  assert.ok(typeof metadata.axe_version === 'string', 'axe_version should be a string');
  assert.ok(typeof metadata.last_updated === 'string', 'last_updated should be a string');
  assert.ok(typeof metadata.next_review_date === 'string', 'next_review_date should be a string');
  assert.ok(typeof metadata.source_url === 'string', 'source_url should be a string');
  assert.match(metadata.last_updated, /^\d{4}-\d{2}-\d{2}$/, 'last_updated should be YYYY-MM-DD');
  assert.match(metadata.next_review_date, /^\d{4}-\d{2}-\d{2}$/, 'next_review_date should be YYYY-MM-DD');
});

test('getAxeImpactRules returns object with metadata and rules array', () => {
  const data = getAxeImpactRules();

  assert.ok(data && typeof data === 'object', 'should return an object');
  assert.ok(Array.isArray(data.rules), 'rules should be an array');
  assert.ok(data.rules.length > 0, 'rules array should not be empty');
  assert.ok(data.metadata && typeof data.metadata === 'object', 'metadata should be present');
});

test('getAxeImpactRuleMap returns a Map keyed by rule_id', () => {
  const ruleMap = getAxeImpactRuleMap();

  assert.ok(ruleMap instanceof Map, 'should return a Map');
  assert.ok(ruleMap.size > 0, 'Map should not be empty');
});

test('each rule entry has required fields', () => {
  const { rules } = getAxeImpactRules();

  for (const rule of rules) {
    assert.ok(typeof rule.rule_id === 'string' && rule.rule_id.length > 0,
      `rule_id should be a non-empty string (got: ${JSON.stringify(rule.rule_id)})`);
    assert.ok(typeof rule.technical_summary === 'string' && rule.technical_summary.length > 0,
      `technical_summary missing or empty for rule: ${rule.rule_id}`);
    assert.ok(rule.policy_narrative && typeof rule.policy_narrative === 'object',
      `policy_narrative missing for rule: ${rule.rule_id}`);
    assert.ok(typeof rule.policy_narrative.title === 'string' && rule.policy_narrative.title.length > 0,
      `policy_narrative.title missing or empty for rule: ${rule.rule_id}`);
    assert.ok(typeof rule.policy_narrative.why_it_matters === 'string' && rule.policy_narrative.why_it_matters.length > 0,
      `policy_narrative.why_it_matters missing or empty for rule: ${rule.rule_id}`);
    assert.ok(Array.isArray(rule.policy_narrative.affected_demographics),
      `policy_narrative.affected_demographics should be an array for rule: ${rule.rule_id}`);
    assert.ok(rule.policy_narrative.affected_demographics.length > 0,
      `policy_narrative.affected_demographics should not be empty for rule: ${rule.rule_id}`);
  }
});

test('getPolicyNarrative returns narrative for known rule', () => {
  const narrative = getPolicyNarrative('color-contrast');

  assert.ok(narrative !== null, 'should return narrative for color-contrast');
  assert.ok(typeof narrative.title === 'string', 'title should be a string');
  assert.ok(typeof narrative.why_it_matters === 'string', 'why_it_matters should be a string');
  assert.ok(Array.isArray(narrative.affected_demographics), 'affected_demographics should be an array');
});

test('getPolicyNarrative returns narrative for target-size', () => {
  const narrative = getPolicyNarrative('target-size');

  assert.ok(narrative !== null, 'should return narrative for target-size');
  assert.ok(narrative.why_it_matters.length > 50, 'why_it_matters should be substantive');
});

test('getPolicyNarrative returns null for unknown rule', () => {
  const narrative = getPolicyNarrative('non-existent-rule-xyz');
  assert.equal(narrative, null);
});

test('getTechnicalSummary returns summary for known rule', () => {
  const summary = getTechnicalSummary('image-alt');

  assert.ok(typeof summary === 'string', 'should return a string');
  assert.ok(summary.length > 0, 'should not be empty');
});

test('getTechnicalSummary returns null for unknown rule', () => {
  const summary = getTechnicalSummary('not-a-real-rule');
  assert.equal(summary, null);
});

test('isAxeImpactDataStale returns false for future review date', () => {
  assert.equal(isAxeImpactDataStale('2025-01-01'), false);
});

test('isAxeImpactDataStale returns true for past review date', () => {
  assert.equal(isAxeImpactDataStale('2099-12-31'), true);
});

test('all AXE_TO_FPC rules have entries in the YAML', async () => {
  const { AXE_TO_FPC } = await import('../../src/data/axe-fpc-mapping.js');
  const ruleMap = getAxeImpactRuleMap();

  const missing = [];
  for (const ruleId of AXE_TO_FPC.keys()) {
    if (!ruleMap.has(ruleId)) {
      missing.push(ruleId);
    }
  }

  assert.deepEqual(
    missing,
    [],
    `The following rules from AXE_TO_FPC are missing from axe-impact-rules.yaml: ${missing.join(', ')}`
  );
});

test('rule IDs in YAML are unique', () => {
  const { rules } = getAxeImpactRules();
  const seen = new Set();
  const duplicates = [];

  for (const rule of rules) {
    if (seen.has(rule.rule_id)) {
      duplicates.push(rule.rule_id);
    }
    seen.add(rule.rule_id);
  }

  assert.deepEqual(duplicates, [], `Duplicate rule IDs in YAML: ${duplicates.join(', ')}`);
});
