import { buildTechSummary } from '../scanners/tech-detector.js';
import { buildAccessibilityStatementSummary } from '../scanners/accessibility-statement-checker.js';
import { buildRequiredLinksSummary } from '../scanners/required-links-checker.js';
import { lookupDomain, hostnameFromUrl } from '../data/dotgov-lookup.js';

function coerceScore(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return 0;
}

/**
 * Produce a compact per-URL code quality summary suitable for the top_urls array.
 * Avoids embedding full audit item payloads to keep the report JSON size manageable.
 *
 * @param {object|null} audits - raw code_quality_audits from a URL scan result
 * @returns {object|null}
 */
function summarizeCodeQualityAudits(audits) {
  if (!audits) return null;
  return {
    deprecated_apis_passing: audits.deprecated_apis?.passing ?? null,
    deprecated_apis_count: audits.deprecated_apis?.items?.length ?? 0,
    errors_in_console_passing: audits.errors_in_console?.passing ?? null,
    errors_in_console_count: audits.errors_in_console?.count ?? 0,
    no_document_write_passing: audits.no_document_write?.passing ?? null,
    vulnerable_libraries_passing: audits.vulnerable_libraries?.passing ?? null,
    vulnerable_libraries_count: audits.vulnerable_libraries?.items?.length ?? 0,
    vulnerable_library_names: (audits.vulnerable_libraries?.items ?? [])
      .map((item) => item.library)
      .filter(Boolean),
    js_libraries: (audits.js_libraries?.items ?? []).map((l) => l.name).filter(Boolean)
  };
}

/**
 * Aggregate code quality audit results across all successfully scanned URLs.
 *
 * @param {Array} urlResults - normalized URL scan results
 * @returns {object}
 */
export function buildCodeQualitySummary(urlResults = []) {
  const successful = urlResults.filter(
    (r) => r?.scan_status === 'success' && r.code_quality_audits != null
  );

  const auditUrls = {
    deprecated_apis: [],
    console_errors: [],
    document_write: [],
    vulnerable_libraries: []
  };

  const jsLibraryCounts = {};
  const vulnerableLibraryCounts = {};

  for (const result of successful) {
    const qa = result.code_quality_audits;

    if (qa.deprecated_apis?.passing === false) {
      auditUrls.deprecated_apis.push(result.url);
    }
    if (qa.errors_in_console?.passing === false) {
      auditUrls.console_errors.push(result.url);
    }
    if (qa.no_document_write?.passing === false) {
      auditUrls.document_write.push(result.url);
    }
    if (qa.vulnerable_libraries?.passing === false) {
      auditUrls.vulnerable_libraries.push(result.url);
      for (const lib of qa.vulnerable_libraries.items ?? []) {
        if (lib.library) {
          if (!vulnerableLibraryCounts[lib.library]) {
            vulnerableLibraryCounts[lib.library] = { count: 0, severity: lib.severity };
          }
          vulnerableLibraryCounts[lib.library].count += 1;
        }
      }
    }
    for (const lib of qa.js_libraries?.items ?? []) {
      if (lib.name) {
        jsLibraryCounts[lib.name] = (jsLibraryCounts[lib.name] ?? 0) + 1;
      }
    }
  }

  return {
    total_scanned: successful.length,
    urls_with_deprecated_apis: auditUrls.deprecated_apis.length,
    urls_with_console_errors: auditUrls.console_errors.length,
    urls_with_document_write: auditUrls.document_write.length,
    urls_with_vulnerable_libraries: auditUrls.vulnerable_libraries.length,
    js_library_counts: jsLibraryCounts,
    vulnerable_library_counts: vulnerableLibraryCounts,
    audit_urls: auditUrls
  };
}

function normalizeTopUrls(urlResults = [], dotgovLookup = null) {
  return urlResults
    .map((result) => {
      const hostname = hostnameFromUrl(result.url);
      const domainInfo = hostname ? lookupDomain(hostname, dotgovLookup) : null;
      return {
      url: result.url,
      organization_name: domainInfo?.organization_name ?? null,
      domain_type: domainInfo?.domain_type ?? null,
      page_load_count: result.page_load_count ?? 0,
      scan_status: result.scan_status,
      failure_reason: result.failure_reason ?? null,
      findings_count: Array.isArray(result.axe_findings) ? result.axe_findings.length : 0,
      severe_findings_count: Array.isArray(result.axe_findings)
        ? result.axe_findings.filter((f) => f.impact === 'critical' || f.impact === 'serious').length
        : 0,
      core_web_vitals_status: result.core_web_vitals_status ?? 'unknown',
      lcp_value_ms: typeof result.lcp_value_ms === 'number' ? result.lcp_value_ms : null,
      detected_technologies: result.detected_technologies ?? null,
      code_quality_summary: summarizeCodeQualityAudits(result.code_quality_audits),
      lighthouse_scores:
        result.scan_status === 'success'
          ? {
              performance: coerceScore(result.lighthouse_performance),
              accessibility: coerceScore(result.lighthouse_accessibility),
              best_practices: coerceScore(result.lighthouse_best_practices),
              seo: coerceScore(result.lighthouse_seo),
              pwa: coerceScore(result.lighthouse_pwa)
            }
          : null,
      axe_findings: Array.isArray(result.axe_findings) ? result.axe_findings : []
      };
    })
    .sort((left, right) => right.page_load_count - left.page_load_count);
}

export function buildDailyReport({
  runMetadata,
  scoreSummary,
  weightedImpact,
  prevalenceImpact,
  fpcExclusion,
  historyWindow,
  urlResults = [],
  performanceImpact = null,
  dotgovLookup = null,
  accessibilityStatements = null,
  requiredLinks = null
}) {
  const succeeded = urlResults.filter((result) => result?.scan_status === 'success').length;
  const failed = urlResults.filter((result) => result?.scan_status === 'failed').length;
  const excluded = urlResults.filter((result) => result?.scan_status === 'excluded').length;

  const categories = Object.entries(prevalenceImpact?.categories ?? {}).map(([name, values]) => ({
    name,
    prevalence_rate: values.prevalence_rate ?? 0,
    estimated_impacted_users: values.estimated_impacted_users ?? 0
  }));

  const historySeries = (historyWindow?.history_series ?? []).map((entry) => ({
    date: entry.run_date,
    aggregate_scores: {
      performance: coerceScore(entry.aggregate_scores?.performance),
      accessibility: coerceScore(entry.aggregate_scores?.accessibility),
      best_practices: coerceScore(entry.aggregate_scores?.best_practices),
      seo: coerceScore(entry.aggregate_scores?.seo),
      pwa: coerceScore(entry.aggregate_scores?.pwa)
    }
  }));

  const topUrls = normalizeTopUrls(urlResults, dotgovLookup);
  const techSummary = buildTechSummary(urlResults);
  techSummary.accessibility_statement_summary = buildAccessibilityStatementSummary(
    accessibilityStatements ?? {}
  );
  techSummary.required_links_summary = buildRequiredLinksSummary(requiredLinks ?? {});

  const codeQualitySummary = buildCodeQualitySummary(urlResults);

  const sourceDataDate = urlResults.reduce((latest, result) => {
    const candidate = result?.source_date;
    if (!candidate) {
      return latest;
    }
    return !latest || candidate > latest ? candidate : latest;
  }, null);

  return {
    run_date: runMetadata.run_date,
    run_id: runMetadata.run_id,
    url_limit: runMetadata.url_limit_requested,
    url_counts: {
      processed: urlResults.length,
      succeeded,
      failed,
      excluded
    },
    aggregate_scores: {
      performance: coerceScore(scoreSummary?.aggregate_scores?.performance?.mean_score),
      accessibility: coerceScore(scoreSummary?.aggregate_scores?.accessibility?.mean_score),
      best_practices: coerceScore(scoreSummary?.aggregate_scores?.best_practices?.mean_score),
      seo: coerceScore(scoreSummary?.aggregate_scores?.seo?.mean_score),
      pwa: coerceScore(scoreSummary?.aggregate_scores?.pwa?.mean_score)
    },
    estimated_impact: {
      traffic_window_mode: weightedImpact?.traffic_window_mode ?? runMetadata.traffic_window_mode,
      affected_share_percent: weightedImpact?.totals?.affected_share_percent ?? 0,
      categories
    },
    fpc_exclusion: fpcExclusion ?? null,
    performance_impact: performanceImpact ?? null,
    source_data_date: sourceDataDate,
    top_urls: topUrls,
    tech_summary: techSummary,
    code_quality_summary: codeQualitySummary,
    trend_window_days: historyWindow?.window_days ?? 30,
    history_series: historySeries,
    generated_at: runMetadata.generated_at,
    report_status: failed > 0 ? 'partial' : 'success'
  };
}
