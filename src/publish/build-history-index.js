export function buildHistoryIndex(existingEntries = [], latestReport, options = {}) {
  const lookbackDays = Number.isInteger(options.lookbackDays) && options.lookbackDays > 0 ? options.lookbackDays : 30;

  const nextEntry = {
    run_date: latestReport.run_date,
    run_id: latestReport.run_id,
    report_path: `daily/${latestReport.run_date}/report.json`,
    page_path: `daily/${latestReport.run_date}/index.html`,
    generated_at: latestReport.generated_at
  };

  const deduped = [nextEntry, ...existingEntries.filter((entry) => entry.run_date !== latestReport.run_date)];
  const ordered = deduped.sort((left, right) => right.run_date.localeCompare(left.run_date));

  return {
    generated_at: latestReport.generated_at,
    lookback_days: lookbackDays,
    entries: ordered.slice(0, lookbackDays)
  };
}
