export const FAILURE_REASON_CATALOG = Object.freeze({
  TIMEOUT: 'timeout',
  LIGHTHOUSE_ERROR: 'lighthouse_error',
  SCANGOV_ERROR: 'scangov_error',
  EXECUTION_ERROR: 'execution_error',
  MALFORMED_OUTPUT: 'malformed_output',
  EXCLUDED_MISSING_URL: 'excluded_missing_url',
  EXCLUDED_BY_LIMIT: 'excluded_by_limit'
});

export function classifyScanStatus({
  excludedReason,
  failureReason,
  lighthouseError,
  scanGovError
} = {}) {
  if (excludedReason) {
    return {
      scan_status: 'excluded',
      failure_reason: excludedReason
    };
  }

  if (failureReason) {
    return {
      scan_status: 'failed',
      failure_reason: failureReason
    };
  }

  if (lighthouseError) {
    return {
      scan_status: 'failed',
      failure_reason: FAILURE_REASON_CATALOG.LIGHTHOUSE_ERROR
    };
  }

  if (scanGovError) {
    return {
      scan_status: 'failed',
      failure_reason: FAILURE_REASON_CATALOG.SCANGOV_ERROR
    };
  }

  return {
    scan_status: 'success',
    failure_reason: null
  };
}
