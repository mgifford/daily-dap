import { AXE_TO_FPC, FPC_LABELS } from '../data/axe-fpc-mapping.js';
import { CENSUS_DISABILITY_STATS } from '../data/census-disability-stats.js';
import { roundToTwo } from '../lib/math-utils.js';

/**
 * For a single URL result, return the set of FPC codes affected by its axe findings.
 * Prefers axe_findings (from Lighthouse) because they carry axe rule IDs that map
 * directly to FPC codes. Falls back to accessibility_findings (from ScanGov) when
 * axe_findings are absent.
 * @param {object} result - A URL scan result with axe_findings or accessibility_findings.
 * @returns {Set<string>} Set of FPC codes (e.g. 'WV', 'LV', ...)
 */
function getFpcCodesForResult(result) {
  const findings =
    Array.isArray(result.axe_findings) && result.axe_findings.length > 0
      ? result.axe_findings
      : Array.isArray(result.accessibility_findings)
        ? result.accessibility_findings
        : [];
  const affected = new Set();
  for (const finding of findings) {
    const ruleId = finding?.rule_id ?? finding?.id;
    if (!ruleId) {
      continue;
    }
    const codes = AXE_TO_FPC.get(ruleId);
    if (codes) {
      for (const code of codes) {
        affected.add(code);
      }
    }
  }
  return affected;
}

/**
 * Compute per-FPC-category estimated excluded Americans from daily accessibility findings.
 *
 * Algorithm:
 *   For each FPC category C:
 *     1. Find all successfully-scanned URLs that have at least one axe finding mapped to C.
 *     2. Sum their page_load_count values -> affected_page_loads_C
 *     3. estimated_excluded_C = affected_page_loads_C * fpc_rates[C].rate
 *
 * @param {Array<object>} urlResults - Normalized URL scan results (from result-normalizer.js).
 * @param {object} [censusStats] - Override for census data; defaults to CENSUS_DISABILITY_STATS.
 * @returns {object} FPC exclusion report object.
 */
export function computeFpcExclusion(urlResults = [], censusStats = CENSUS_DISABILITY_STATS) {
  const fpcRates = censusStats.fpc_rates ?? {};
  const allFpcCodes = Object.keys(fpcRates);

  // Only count successfully-scanned URLs.
  const successfulResults = urlResults.filter((r) => r?.scan_status === 'success');

  // Build per-FPC affected page-load totals.
  const fpcAffectedLoads = {};
  for (const code of allFpcCodes) {
    fpcAffectedLoads[code] = 0;
  }

  let totalPageLoads = 0;

  for (const result of successfulResults) {
    const pageLoads = typeof result.page_load_count === 'number' && result.page_load_count > 0
      ? result.page_load_count
      : 0;
    totalPageLoads += pageLoads;

    const affectedCodes = getFpcCodesForResult(result);
    for (const code of affectedCodes) {
      if (code in fpcAffectedLoads) {
        fpcAffectedLoads[code] += pageLoads;
      }
    }
  }

  // Build per-FPC output.
  const categories = {};
  for (const code of allFpcCodes) {
    const rateData = fpcRates[code];
    const affectedLoads = fpcAffectedLoads[code];
    const estimatedExcluded = roundToTwo(affectedLoads * rateData.rate);
    const sharePercent = totalPageLoads === 0
      ? 0
      : roundToTwo((affectedLoads / totalPageLoads) * 100);

    categories[code] = {
      label: FPC_LABELS[code] ?? code,
      prevalence_rate: rateData.rate,
      estimated_population: rateData.estimated_population,
      affected_page_loads: affectedLoads,
      affected_share_percent: sharePercent,
      estimated_excluded_users: estimatedExcluded,
      source_note: rateData.source_note ?? ''
    };
  }

  return {
    total_page_loads: totalPageLoads,
    scanned_url_count: successfulResults.length,
    categories,
    census_vintage_year: censusStats.vintage_year,
    census_source: censusStats.source,
    census_source_url: censusStats.source_url
  };
}
