import { classifyScanStatus, FAILURE_REASON_CATALOG } from './status-classifier.js';
import { normalizeSeverity } from './scangov-runner.js';
import { extractAxeFindings } from './axe-extractor.js';
import { computeWordsPerMb } from './readability-extractor.js';

function normalizeFindings(url, findings = []) {
  return findings.map((finding) => ({
    ...finding,
    url,
    severity: normalizeSeverity(finding.severity)
  }));
}

function normalizeReadabilityMetrics(readabilityResult, totalByteWeight) {
  if (!readabilityResult) return null;
  return {
    word_count: readabilityResult.word_count ?? null,
    char_count: readabilityResult.char_count ?? null,
    words_per_mb: computeWordsPerMb(readabilityResult.word_count, totalByteWeight)
  };
}

export function normalizeUrlScanResult({
  runId,
  urlRecord,
  lighthouseResult,
  scanGovResult,
  readabilityResult,
  excludedReason,
  failureReason,
  diagnostics = {}
}) {
  const status = classifyScanStatus({ excludedReason, failureReason });

  // Detect zero-score scans: if the scan appears successful but Lighthouse produced
  // no meaningful scores (all primary categories are null or 0), treat as failed.
  if (
    status.scan_status === 'success' &&
    lighthouseResult != null &&
    [
      lighthouseResult.lighthouse_performance,
      lighthouseResult.lighthouse_accessibility,
      lighthouseResult.lighthouse_best_practices,
      lighthouseResult.lighthouse_seo
    ].every((score) => score === null || score === 0)
  ) {
    status.scan_status = 'failed';
    status.failure_reason = FAILURE_REASON_CATALOG.ALL_SCORES_ZERO;
  }

  return {
    run_id: runId,
    url: urlRecord.url,
    page_load_count: urlRecord.page_load_count ?? null,
    source_date: urlRecord.source_date ?? null,
    scan_status: status.scan_status,
    failure_reason: status.failure_reason,
    lighthouse_performance: lighthouseResult?.lighthouse_performance ?? null,
    lighthouse_accessibility: lighthouseResult?.lighthouse_accessibility ?? null,
    lighthouse_best_practices: lighthouseResult?.lighthouse_best_practices ?? null,
    lighthouse_seo: lighthouseResult?.lighthouse_seo ?? null,
    lighthouse_pwa: lighthouseResult?.lighthouse_pwa ?? null,
    core_web_vitals_status: lighthouseResult?.core_web_vitals_status ?? 'unknown',
    lcp_value_ms: lighthouseResult?.lcp_value_ms ?? null,
    total_byte_weight: lighthouseResult?.total_byte_weight ?? null,
    detected_technologies: lighthouseResult?.detected_technologies ?? null,
    code_quality_audits: lighthouseResult?.code_quality_audits ?? null,
    readability_metrics: normalizeReadabilityMetrics(
      readabilityResult ?? null,
      lighthouseResult?.total_byte_weight ?? null
    ),
    accessibility_findings: normalizeFindings(urlRecord.url, scanGovResult?.accessibility_findings),
    axe_findings: extractAxeFindings(lighthouseResult?.raw),
    scan_diagnostics: {
      attempt_count: diagnostics.attempt_count ?? 0,
      retry_count: diagnostics.retry_count ?? 0,
      timeout_count: diagnostics.timeout_count ?? 0,
      raw: {
        lighthouse: lighthouseResult?.raw ?? null,
        scangov: scanGovResult?.raw ?? null
      }
    }
  };
}
