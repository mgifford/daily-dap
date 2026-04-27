import { roundToTwo, normalizeTraffic } from '../lib/math-utils.js';

// Google's published performance benchmarks used for comparison.
// LCP: https://web.dev/articles/lcp — "good" threshold is 2.5 s
// Page weight: https://web.dev/articles/performance-budgets-101 — recommended under 1.6 MB
export const GOOD_LCP_MS = 2500;
export const RECOMMENDED_PAGE_WEIGHT_BYTES = 1_600_000;

/**
 * Computes how much extra time Americans spend waiting for slow government
 * websites and how much extra data is transferred, compared to Google's
 * performance benchmarks.
 *
 * @param {Array} urlResults - Normalised URL scan results from execution-manager.
 * @returns {object} Performance impact summary.
 */
export function buildPerformanceImpact(urlResults = []) {
  const urlsWithTiming = urlResults.filter(
    (r) => r?.scan_status === 'success' && typeof r.lcp_value_ms === 'number' && r.lcp_value_ms > 0
  );

  let totalExtraLoadTimeSeconds = 0;
  let totalExtraBytes = 0;
  let urlCountWithWeight = 0;

  for (const result of urlsWithTiming) {
    const loads = normalizeTraffic(result.page_load_count);
    const extraSeconds = Math.max(0, (result.lcp_value_ms - GOOD_LCP_MS) / 1000);
    totalExtraLoadTimeSeconds += extraSeconds * loads;

    if (typeof result.total_byte_weight === 'number' && result.total_byte_weight > 0) {
      const extraBytes = Math.max(0, result.total_byte_weight - RECOMMENDED_PAGE_WEIGHT_BYTES);
      totalExtraBytes += extraBytes * loads;
      urlCountWithWeight += 1;
    }
  }

  const totalExtraLoadTimeHours = roundToTwo(totalExtraLoadTimeSeconds / 3600);

  return {
    benchmark_lcp_ms: GOOD_LCP_MS,
    benchmark_page_weight_bytes: RECOMMENDED_PAGE_WEIGHT_BYTES,
    url_count_with_timing: urlsWithTiming.length,
    url_count_with_weight: urlCountWithWeight,
    total_extra_load_time_seconds: Math.round(totalExtraLoadTimeSeconds),
    total_extra_load_time_hours: totalExtraLoadTimeHours,
    total_extra_bytes: Math.round(totalExtraBytes),
    total_extra_gigabytes: roundToTwo(totalExtraBytes / 1e9)
  };
}
