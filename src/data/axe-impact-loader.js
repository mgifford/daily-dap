// Loader for axe-core rule impact mappings.
//
// Reads src/data/axe-impact-rules.yaml and provides lookup functions
// for policy narratives by rule ID.
//
// The YAML is parsed once at module load time and cached for performance.
//
// Review schedule: The YAML data should be refreshed every 6 months to keep
// pace with axe-core releases. Run the check-axe-rules workflow or execute
// `node src/cli/update-axe-rules.js --check` to verify currency.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { load as yamlLoad } from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const YAML_PATH = join(__dirname, 'axe-impact-rules.yaml');

let _parsed = null;

function getParsed() {
  if (!_parsed) {
    const raw = readFileSync(YAML_PATH, 'utf8');
    _parsed = yamlLoad(raw);
  }
  return _parsed;
}

/**
 * Returns the full parsed YAML document including metadata and rules array.
 *
 * @returns {{ metadata: object, rules: Array }}
 */
export function getAxeImpactRules() {
  return getParsed();
}

/**
 * Returns a Map<string, object> from rule_id to the rule entry object.
 * Cached after first call.
 *
 * @returns {Map<string, object>}
 */
let _ruleMap = null;
export function getAxeImpactRuleMap() {
  if (!_ruleMap) {
    const { rules = [] } = getParsed();
    _ruleMap = new Map(rules.map((r) => [r.rule_id, r]));
  }
  return _ruleMap;
}

/**
 * Returns the policy narrative object for a given axe rule ID,
 * or null if no entry exists.
 *
 * @param {string} ruleId - axe-core rule ID (e.g. "color-contrast")
 * @returns {{ title: string, why_it_matters: string, affected_demographics: string[] } | null}
 */
export function getPolicyNarrative(ruleId) {
  const entry = getAxeImpactRuleMap().get(ruleId);
  return entry?.policy_narrative ?? null;
}

/**
 * Returns the technical summary string for a given axe rule ID,
 * or null if no entry exists.
 *
 * @param {string} ruleId - axe-core rule ID
 * @returns {string | null}
 */
export function getTechnicalSummary(ruleId) {
  const entry = getAxeImpactRuleMap().get(ruleId);
  return entry?.technical_summary ?? null;
}

/**
 * Returns the metadata block from the YAML (axe_version, last_updated, next_review_date).
 *
 * @returns {{ axe_version: string, last_updated: string, next_review_date: string, source_url: string }}
 */
export function getAxeImpactMetadata() {
  return getParsed().metadata ?? {};
}

/**
 * Returns true if the review date is in the past relative to checkDate.
 *
 * @param {string} [checkDate] - ISO date string (YYYY-MM-DD), defaults to today
 * @returns {boolean}
 */
export function isAxeImpactDataStale(checkDate) {
  const today = checkDate ?? new Date().toISOString().slice(0, 10);
  const { next_review_date } = getAxeImpactMetadata();
  if (!next_review_date) return false;
  return today >= next_review_date;
}
