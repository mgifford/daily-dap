#!/usr/bin/env node
// Script to check and update axe-core rule impact data.
//
// Usage:
//   node src/cli/update-axe-rules.js --check
//     Checks whether the installed axe-core version matches the YAML metadata
//     and whether the review date has passed. Exits with code 1 if stale.
//
//   node src/cli/update-axe-rules.js --list-new
//     Lists any axe-core rule IDs that appear in the installed axe-core but
//     are not yet present in axe-impact-rules.yaml.
//
// This script is intended to be run by the GitHub Actions workflow
// check-axe-rules.yml, which runs on a schedule every 6 months.

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { getAxeImpactMetadata, getAxeImpactRuleMap, isAxeImpactDataStale } from '../data/axe-impact-loader.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const args = process.argv.slice(2);
const isCheck = args.includes('--check');
const isListNew = args.includes('--list-new');

if (!isCheck && !isListNew) {
  console.error('Usage: node src/cli/update-axe-rules.js [--check] [--list-new]');
  process.exit(1);
}

// Load installed axe-core metadata
let axeVersion = 'unknown';
let installedRuleIds = [];
try {
  const axePkg = require('axe-core/package.json');
  axeVersion = axePkg.version;
  const axe = require('axe-core');
  installedRuleIds = axe.getRules().map((r) => r.ruleId);
} catch (err) {
  console.warn('Warning: could not load axe-core:', err.message);
}

const metadata = getAxeImpactMetadata();
const ruleMap = getAxeImpactRuleMap();

console.log('=== Axe Rule Impact Data Check ===');
console.log(`YAML axe_version:       ${metadata.axe_version ?? '(none)'}`);
console.log(`Installed axe-core:     ${axeVersion}`);
console.log(`YAML last_updated:      ${metadata.last_updated ?? '(none)'}`);
console.log(`YAML next_review_date:  ${metadata.next_review_date ?? '(none)'}`);
console.log(`YAML rules count:       ${ruleMap.size}`);
console.log(`Installed rules count:  ${installedRuleIds.length}`);
console.log('');

let exitCode = 0;

if (isCheck) {
  const today = new Date().toISOString().slice(0, 10);
  const stale = isAxeImpactDataStale(today);

  if (stale) {
    console.log(`\u26a0\ufe0f  Review date (${metadata.next_review_date}) has passed. YAML data is stale.`);
    exitCode = 1;
  }

  // Check whether the YAML axe_version major.minor matches installed
  const yamlMajorMinor = (metadata.axe_version ?? '').split('.').slice(0, 2).join('.');
  const installedMajorMinor = axeVersion.split('.').slice(0, 2).join('.');
  if (axeVersion !== 'unknown' && yamlMajorMinor !== installedMajorMinor) {
    console.log(`\u26a0\ufe0f  YAML axe_version (${metadata.axe_version}) does not match installed axe-core (${axeVersion}).`);
    exitCode = 1;
  }

  if (exitCode === 0) {
    console.log('\u2705 Axe impact data is current. No action needed.');
  }
}

if (isListNew) {
  const missingFromYaml = installedRuleIds.filter((id) => !ruleMap.has(id));

  if (missingFromYaml.length === 0) {
    console.log('\u2705 All installed axe-core rules are present in axe-impact-rules.yaml.');
  } else {
    console.log(`\u26a0\ufe0f  ${missingFromYaml.length} rule(s) in axe-core but missing from axe-impact-rules.yaml:`);
    for (const id of missingFromYaml) {
      console.log(`  - ${id}`);
    }
    exitCode = 1;
  }
}

process.exitCode = exitCode;
