// Loader for axe-core rule impact mappings.
//
// Reads src/data/axe-impact-rules.yaml and provides lookup functions
// for policy narratives by rule ID.
//
// The YAML is parsed once at module load time and cached for performance.
//
// The YAML includes:
//   - metadata: axe-core version, review dates, FPC source URLs
//   - functional_performance_specification: U.S. FPC and EU EN 301 549 category data
//   - rules: per-rule technical summaries, policy narratives, fpc_codes, wcag_sc, en301549_clauses
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
 * Returns the full parsed YAML document including metadata, functional_performance_specification,
 * and rules array.
 *
 * @returns {{ metadata: object, functional_performance_specification: object, rules: Array }}
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
 * Returns the FPC codes array for a given axe rule ID, or null if no entry exists.
 * These are the Section 508 Functional Performance Criteria codes (e.g. ["WV", "WH", "LM"]).
 *
 * @param {string} ruleId - axe-core rule ID
 * @returns {string[] | null}
 */
export function getRuleFpcCodes(ruleId) {
  const entry = getAxeImpactRuleMap().get(ruleId);
  return entry?.fpc_codes ?? null;
}

/**
 * Returns the WCAG Success Criteria info for a given axe rule ID, or null if no entry exists.
 *
 * @param {string} ruleId - axe-core rule ID
 * @returns {Object|null} Object with sc (string[]), draft (boolean), version_note (string|null); or null
 */
export function getRuleWcagSc(ruleId) {
  const entry = getAxeImpactRuleMap().get(ruleId);
  if (!entry?.wcag_sc) return null;
  return {
    sc: entry.wcag_sc,
    draft: entry.wcag_sc_draft ?? false,
    version_note: entry.wcag_version_note ?? null,
  };
}

/**
 * Returns the EN 301 549 clause info for a given axe rule ID, or null if no entry exists.
 * These map to EU web accessibility standard (section 9.x.x.x clauses).
 *
 * @param {string} ruleId - axe-core rule ID
 * @returns {Object|null} Object with clauses (string[]) and draft (boolean); or null
 */
export function getRuleEn301549Clauses(ruleId) {
  const entry = getAxeImpactRuleMap().get(ruleId);
  if (!entry?.en301549_clauses) return null;
  return {
    clauses: entry.en301549_clauses,
    draft: entry.en301549_draft ?? false,
  };
}

/**
 * Returns the Functional Performance Specification data from the YAML.
 * Includes both U.S. FPC and EU EN 301 549 category definitions.
 *
 * @returns {{ us_fpc: object, eu_fps: object } | null}
 */
export function getFunctionalPerformanceSpec() {
  return getParsed().functional_performance_specification ?? null;
}

/**
 * Returns the metadata block from the YAML (axe_version, last_updated, next_review_date, etc.).
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
