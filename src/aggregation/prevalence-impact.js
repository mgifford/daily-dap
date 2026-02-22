function roundToTwo(value) {
  return Math.round(value * 100) / 100;
}

export function estimateCategoryImpact(weightedImpact, prevalenceRates = {}) {
  const weightedAffectedTraffic = weightedImpact?.totals?.weighted_affected_traffic ?? 0;
  const totalPageLoadCount = weightedImpact?.totals?.total_page_load_count ?? 0;

  const categories = Object.fromEntries(
    Object.entries(prevalenceRates).map(([category, prevalenceRate]) => {
      const estimatedImpactedUsers = roundToTwo(weightedAffectedTraffic * prevalenceRate);
      const estimatedSharePercent = totalPageLoadCount === 0 ? 0 : roundToTwo((estimatedImpactedUsers / totalPageLoadCount) * 100);

      return [
        category,
        {
          prevalence_rate: prevalenceRate,
          estimated_impacted_users: estimatedImpactedUsers,
          estimated_impacted_share_percent: estimatedSharePercent
        }
      ];
    })
  );

  return {
    weighted_affected_traffic: weightedAffectedTraffic,
    total_page_load_count: totalPageLoadCount,
    categories
  };
}
