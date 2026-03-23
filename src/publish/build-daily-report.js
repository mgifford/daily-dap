import { buildTechSummary } from '../scanners/tech-detector.js';
import { lookupDomain, hostnameFromUrl } from '../data/dotgov-lookup.js';

function coerceScore(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return 0;
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
  dotgovLookup = null
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
    trend_window_days: historyWindow?.window_days ?? 30,
    history_series: historySeries,
    generated_at: runMetadata.generated_at,
    report_status: failed > 0 ? 'partial' : 'success'
  };
}
