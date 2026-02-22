import { classifyScanStatus } from './status-classifier.js';
import { normalizeSeverity } from './scangov-runner.js';

function normalizeFindings(url, findings = []) {
  return findings.map((finding) => ({
    ...finding,
    url,
    severity: normalizeSeverity(finding.severity)
  }));
}

export function normalizeUrlScanResult({
  runId,
  urlRecord,
  lighthouseResult,
  scanGovResult,
  excludedReason,
  failureReason,
  diagnostics = {}
}) {
  const status = classifyScanStatus({ excludedReason, failureReason });

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
    accessibility_findings: normalizeFindings(urlRecord.url, scanGovResult?.accessibility_findings),
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
