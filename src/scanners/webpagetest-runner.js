import { setTimeout as delay } from 'node:timers/promises';

function toFiniteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function findAuditCollection(rawResult) {
  return (
    rawResult?.data?.median?.firstView?.lighthouse?.audits ??
    rawResult?.data?.runs?.['1']?.firstView?.lighthouse?.audits ??
    rawResult?.lighthouse?.audits ??
    rawResult?.audits ??
    null
  );
}

function extractTopIssues(rawResult, limit = 5) {
  const audits = findAuditCollection(rawResult);
  if (!audits || typeof audits !== 'object') {
    return [];
  }

  return Object.entries(audits)
    .map(([id, audit]) => ({
      issue_id: id,
      title: audit?.title ?? id,
      description: audit?.description ?? null,
      savings_ms: toFiniteNumber(audit?.details?.overallSavingsMs) ?? 0
    }))
    .filter((issue) => issue.savings_ms > 0)
    .sort((left, right) => right.savings_ms - left.savings_ms)
    .slice(0, limit);
}

function parseWebPageTestResult(url, rawResult) {
  const firstView =
    rawResult?.data?.median?.firstView ??
    rawResult?.data?.runs?.['1']?.firstView ??
    rawResult?.firstView ??
    {};

  return {
    url,
    webpagetest_metrics: {
      speed_index_ms: toFiniteNumber(firstView.SpeedIndex),
      first_contentful_paint_ms: toFiniteNumber(firstView.firstContentfulPaint),
      largest_contentful_paint_ms: toFiniteNumber(firstView.largestContentfulPaint),
      time_to_interactive_ms: toFiniteNumber(
        firstView.TimeToInteractive ?? firstView.timeToInteractive
      ),
      total_bytes: toFiniteNumber(firstView.bytesIn)
    },
    webpagetest_issues: extractTopIssues(rawResult),
    raw: rawResult
  };
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(30_000)
  });

  if (!response.ok) {
    throw new Error(`WebPageTest API responded ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Creates a live HTTP runImpl that submits and polls WebPageTest test jobs.
 *
 * @param {object} options
 * @param {string} options.apiBaseUrl
 * @param {string} options.resultApiUrl
 * @param {string} options.apiKey
 * @param {number} [options.pollIntervalMs=5000]
 * @param {number} [options.maxPollAttempts=24]
 * @returns {(url: string) => Promise<object>}
 */
export function createHttpRunImpl({
  apiBaseUrl = 'https://www.webpagetest.org/runtest.php',
  resultApiUrl = 'https://www.webpagetest.org/jsonResult.php',
  apiKey,
  pollIntervalMs = 5000,
  maxPollAttempts = 24
} = {}) {
  if (!apiKey) {
    throw new Error('createHttpRunImpl requires apiKey');
  }

  return async function fetchFromWebPageTest(url) {
    const startEndpoint = new URL(apiBaseUrl);
    startEndpoint.searchParams.set('f', 'json');
    startEndpoint.searchParams.set('url', url);
    startEndpoint.searchParams.set('k', apiKey);
    startEndpoint.searchParams.set('fvonly', '1');
    startEndpoint.searchParams.set('lighthouse', '1');

    const startResult = await fetchJson(startEndpoint.toString());
    const testId = startResult?.data?.testId;
    if (!testId) {
      throw new Error('WebPageTest response missing testId');
    }

    const resultEndpoint = new URL(resultApiUrl);
    resultEndpoint.searchParams.set('f', 'json');
    resultEndpoint.searchParams.set('test', testId);
    resultEndpoint.searchParams.set('k', apiKey);

    for (let attempt = 0; attempt < maxPollAttempts; attempt += 1) {
      const result = await fetchJson(resultEndpoint.toString());
      if (result?.statusCode === 200) {
        return result;
      }
      if (result?.statusCode >= 400) {
        throw new Error(`WebPageTest test failed: ${result?.statusText ?? 'unknown error'}`);
      }
      await delay(pollIntervalMs);
    }

    throw new Error(`WebPageTest test timed out after ${maxPollAttempts} polls`);
  };
}

export async function runWebPageTestScan(url, options = {}) {
  const { runImpl, executionOptions = {} } = options;
  if (typeof runImpl !== 'function') {
    return null;
  }

  const raw = await runImpl(url, executionOptions);
  return parseWebPageTestResult(url, raw);
}

export { parseWebPageTestResult, extractTopIssues };
