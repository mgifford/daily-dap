const SCORE_FIELDS = {
  performance: 'lighthouse_performance',
  accessibility: 'lighthouse_accessibility',
  best_practices: 'lighthouse_best_practices',
  seo: 'lighthouse_seo',
  pwa: 'lighthouse_pwa'
};

function roundToTwo(value) {
  return Math.round(value * 100) / 100;
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export function aggregateCategoryScores(urlResults = []) {
  const successfulResults = urlResults.filter((result) => result?.scan_status === 'success');

  const aggregate_scores = Object.fromEntries(
    Object.entries(SCORE_FIELDS).map(([category, fieldName]) => {
      const values = successfulResults.map((result) => result[fieldName]).filter(isFiniteNumber);
      const mean = values.length === 0 ? null : roundToTwo(values.reduce((sum, value) => sum + value, 0) / values.length);

      return [
        category,
        {
          mean_score: mean,
          url_count_used: values.length
        }
      ];
    })
  );

  return {
    total_url_count: urlResults.length,
    included_url_count: successfulResults.length,
    excluded_url_count: urlResults.length - successfulResults.length,
    aggregate_scores
  };
}
