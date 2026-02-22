export function buildRunDiagnostics(results) {
  const diagnostics = {
    total_urls: results.length,
    success_count: 0,
    failed_count: 0,
    excluded_count: 0,
    timeout_count: 0,
    retry_count: 0,
    failure_reasons: {}
  };

  for (const result of results) {
    if (result.scan_status === 'success') diagnostics.success_count += 1;
    if (result.scan_status === 'failed') diagnostics.failed_count += 1;
    if (result.scan_status === 'excluded') diagnostics.excluded_count += 1;

    diagnostics.timeout_count += result.scan_diagnostics?.timeout_count ?? 0;
    diagnostics.retry_count += result.scan_diagnostics?.retry_count ?? 0;

    if (result.failure_reason) {
      diagnostics.failure_reasons[result.failure_reason] =
        (diagnostics.failure_reasons[result.failure_reason] ?? 0) + 1;
    }
  }

  return diagnostics;
}
