function roundToTwo(value) {
  return Math.round(value * 100) / 100;
}

function normalizeTraffic(value) {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    return 0;
  }
  return value;
}

function normalizeSeverity(severity) {
  if (typeof severity !== 'string') {
    return 'unknown';
  }

  const normalized = severity.trim().toLowerCase();
  if (normalized === 'critical' || normalized === 'serious' || normalized === 'moderate' || normalized === 'minor') {
    return normalized;
  }
  return 'unknown';
}

export function resolvePageLoadCount(record, trafficWindowMode = 'daily') {
  const modeField = {
    daily: 'page_load_count_daily',
    rolling_7d: 'page_load_count_rolling_7d',
    rolling_30d: 'page_load_count_rolling_30d'
  }[trafficWindowMode];

  if (record?.page_load_by_window && typeof record.page_load_by_window === 'object') {
    const windowValue = record.page_load_by_window[trafficWindowMode];
    if (typeof windowValue === 'number' && Number.isFinite(windowValue)) {
      return normalizeTraffic(windowValue);
    }
  }

  if (modeField && typeof record?.[modeField] === 'number' && Number.isFinite(record[modeField])) {
    return normalizeTraffic(record[modeField]);
  }

  return normalizeTraffic(record?.page_load_count);
}

export function estimateWeightedImpact(urlResults = [], config, options = {}) {
  const weights = config?.impact?.severity_weights ?? {};
  const fallbackWeight = config?.impact?.fallback_severity_weight ?? 0;
  const trafficWindowMode = options.trafficWindowMode ?? config?.scan?.traffic_window_mode ?? 'daily';

  const successfulResults = urlResults.filter((result) => result?.scan_status === 'success');

  const url_impacts = successfulResults.map((result) => {
    const findings = Array.isArray(result.accessibility_findings) ? result.accessibility_findings : [];
    const pageLoadCount = resolvePageLoadCount(result, trafficWindowMode);

    const weightedIssueSum = findings.reduce((sum, finding) => {
      const severity = normalizeSeverity(finding?.severity);
      const weight = severity === 'unknown' ? fallbackWeight : (weights[severity] ?? fallbackWeight);
      return sum + weight;
    }, 0);

    const normalizedIssueSignal = findings.length === 0 ? 0 : weightedIssueSum / findings.length;
    const weightedAffectedTraffic = pageLoadCount * Math.min(1, normalizedIssueSignal);

    return {
      url: result.url,
      page_load_count: pageLoadCount,
      finding_count: findings.length,
      weighted_issue_sum: roundToTwo(weightedIssueSum),
      normalized_issue_signal: roundToTwo(normalizedIssueSignal),
      weighted_affected_traffic: roundToTwo(weightedAffectedTraffic)
    };
  });

  const totalPageLoadCount = roundToTwo(url_impacts.reduce((sum, item) => sum + item.page_load_count, 0));
  const totalWeightedAffectedTraffic = roundToTwo(url_impacts.reduce((sum, item) => sum + item.weighted_affected_traffic, 0));
  const affectedSharePercent = totalPageLoadCount === 0 ? 0 : roundToTwo((totalWeightedAffectedTraffic / totalPageLoadCount) * 100);

  return {
    traffic_window_mode: trafficWindowMode,
    url_impacts,
    totals: {
      included_url_count: successfulResults.length,
      total_page_load_count: totalPageLoadCount,
      weighted_affected_traffic: totalWeightedAffectedTraffic,
      affected_share_percent: affectedSharePercent
    }
  };
}
