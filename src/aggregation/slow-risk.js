function roundToTwo(value) {
  return Math.round(value * 100) / 100;
}

function normalizeTraffic(value) {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    return 0;
  }
  return value;
}

export function isSlowRiskStatus(coreWebVitalsStatus) {
  return coreWebVitalsStatus === 'poor';
}

export function annotateSlowRisk(urlResult) {
  return {
    ...urlResult,
    slow_risk: isSlowRiskStatus(urlResult?.core_web_vitals_status)
  };
}

export function buildSlowRiskRollup(urlResults = []) {
  const annotated_results = urlResults.map(annotateSlowRisk);
  const successful = annotated_results.filter((result) => result.scan_status === 'success');
  const slowRiskResults = successful.filter((result) => result.slow_risk);

  const successfulTraffic = successful.reduce((sum, result) => sum + normalizeTraffic(result.page_load_count), 0);
  const slowRiskTraffic = slowRiskResults.reduce((sum, result) => sum + normalizeTraffic(result.page_load_count), 0);
  const slowRiskSharePercent = successfulTraffic === 0 ? 0 : roundToTwo((slowRiskTraffic / successfulTraffic) * 100);

  return {
    annotated_results,
    summary: {
      successful_url_count: successful.length,
      slow_risk_url_count: slowRiskResults.length,
      successful_page_load_count: successfulTraffic,
      slow_risk_page_load_count: slowRiskTraffic,
      slow_risk_traffic_share_percent: slowRiskSharePercent
    }
  };
}
