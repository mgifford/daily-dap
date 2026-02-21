import { setTimeout as delay } from 'node:timers/promises';
import { runLighthouseScan } from './lighthouse-runner.js';
import { runScanGovScan } from './scangov-runner.js';
import { normalizeUrlScanResult } from './result-normalizer.js';
import { buildRunDiagnostics } from './diagnostics.js';
import { FAILURE_REASON_CATALOG } from './status-classifier.js';

class TimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TimeoutError';
  }
}

async function withTimeout(promise, timeoutMs) {
  let timeoutHandle;
  try {
    const timeoutPromise = new Promise((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new TimeoutError(`Timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutHandle);
  }
}

function toFailureReason(error) {
  if (error instanceof TimeoutError) {
    return FAILURE_REASON_CATALOG.TIMEOUT;
  }

  if (error?.code === 'MALFORMED_OUTPUT') {
    return FAILURE_REASON_CATALOG.MALFORMED_OUTPUT;
  }

  return FAILURE_REASON_CATALOG.EXECUTION_ERROR;
}

async function executeSingleRecord(record, options) {
  const {
    runId,
    maxRetries,
    timeoutMs,
    lighthouseRunner,
    scanGovRunner,
    retryDelayMs,
    excludePredicate
  } = options;

  const excludedReason = excludePredicate?.(record) ?? null;
  if (excludedReason) {
    return normalizeUrlScanResult({
      runId,
      urlRecord: record,
      excludedReason,
      diagnostics: { attempt_count: 0, retry_count: 0, timeout_count: 0 }
    });
  }

  let lastError;
  let timeoutCount = 0;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
    try {
      const [lighthouseResult, scanGovResult] = await withTimeout(
        Promise.all([
          runLighthouseScan(record.url, lighthouseRunner),
          runScanGovScan(record.url, scanGovRunner)
        ]),
        timeoutMs
      );

      return normalizeUrlScanResult({
        runId,
        urlRecord: record,
        lighthouseResult,
        scanGovResult,
        diagnostics: {
          attempt_count: attempt,
          retry_count: attempt - 1,
          timeout_count: timeoutCount
        }
      });
    } catch (error) {
      lastError = error;
      if (error instanceof TimeoutError) {
        timeoutCount += 1;
      }

      if (attempt <= maxRetries && retryDelayMs > 0) {
        await delay(retryDelayMs);
      }
    }
  }

  return normalizeUrlScanResult({
    runId,
    urlRecord: record,
    failureReason: toFailureReason(lastError),
    diagnostics: {
      attempt_count: maxRetries + 1,
      retry_count: maxRetries,
      timeout_count: timeoutCount
    }
  });
}

export async function executeUrlScans(urlRecords, options = {}) {
  const {
    runId,
    concurrency = 4,
    timeoutMs = 45_000,
    maxRetries = 1,
    retryDelayMs = 0,
    excludePredicate,
    lighthouseRunner = {},
    scanGovRunner = {}
  } = options;

  if (!runId) {
    throw new Error('executeUrlScans requires runId');
  }

  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error('concurrency must be an integer greater than 0');
  }

  if (!Number.isInteger(maxRetries) || maxRetries < 0) {
    throw new Error('maxRetries must be an integer greater than or equal to 0');
  }

  const results = new Array(urlRecords.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < urlRecords.length) {
      const index = currentIndex;
      currentIndex += 1;
      results[index] = await executeSingleRecord(urlRecords[index], {
        runId,
        timeoutMs,
        maxRetries,
        retryDelayMs,
        excludePredicate,
        lighthouseRunner,
        scanGovRunner
      });
    }
  }

  const workerCount = Math.min(concurrency, urlRecords.length || 1);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return {
    results,
    diagnostics: buildRunDiagnostics(results)
  };
}

export { TimeoutError, toFailureReason, withTimeout };
