const VALID_SEVERITIES = new Set(['critical', 'serious', 'moderate', 'minor']);

function normalizeSeverity(rawSeverity) {
  if (!rawSeverity || typeof rawSeverity !== 'string') {
    return 'unknown';
  }

  const normalized = rawSeverity.trim().toLowerCase();
  return VALID_SEVERITIES.has(normalized) ? normalized : 'unknown';
}

function extractIssues(rawResult) {
  if (Array.isArray(rawResult)) {
    return rawResult;
  }

  if (Array.isArray(rawResult?.issues)) {
    return rawResult.issues;
  }

  if (Array.isArray(rawResult?.findings)) {
    return rawResult.findings;
  }

  return [];
}

function normalizeFinding(url, issue) {
  return {
    url,
    issue_code: issue.code ?? issue.id ?? issue.rule_id ?? 'unknown_issue',
    issue_category: issue.category ?? issue.group ?? 'unknown',
    severity: normalizeSeverity(issue.severity ?? issue.impact),
    message: issue.message ?? issue.description ?? 'No message provided',
    selector_or_location: issue.selector ?? issue.location ?? null,
    source_tool: 'scangov'
  };
}

export async function runScanGovScan(url, options = {}) {
  const { runImpl, executionOptions = {} } = options;

  if (typeof runImpl !== 'function') {
    throw new Error('runScanGovScan requires options.runImpl function');
  }

  const raw = await runImpl(url, executionOptions);
  const issues = extractIssues(raw);

  return {
    url,
    accessibility_findings: issues.map((issue) => normalizeFinding(url, issue)),
    raw
  };
}

export { normalizeSeverity, normalizeFinding, extractIssues };
