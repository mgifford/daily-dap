import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { detectTechnologies } from './tech-detector.js';

/**
 * Extract code quality audit results from a raw Lighthouse result.
 * Covers browser-compatibility-relevant audits in the best-practices category:
 *   - uses-deprecated-api  (deprecated browser APIs / CSS / JS)
 *   - errors-in-console    (runtime JavaScript errors)
 *   - no-document-write    (synchronous document.write calls)
 *   - no-vulnerable-libraries (libraries with known CVEs)
 *   - js-libraries         (detected JS library names & versions, informational)
 *
 * Returns null when the raw result has no audits object.
 *
 * @param {object|null} rawResult - Raw Lighthouse LHR object
 * @returns {object|null}
 */
export function extractCodeQualityAudits(rawResult) {
  if (!rawResult?.audits) {
    return null;
  }

  const audits = rawResult.audits;

  function auditScore(id) {
    const score = audits[id]?.score;
    if (score === null || score === undefined) return null;
    return Number(score) === 1;
  }

  function auditItems(id) {
    return audits[id]?.details?.items ?? [];
  }

  const deprecatedItems = auditItems('uses-deprecated-api').map((item) => ({
    value: String(item.value ?? item.text ?? '')
  }));

  const consoleItems = auditItems('errors-in-console');

  const vulnerableItems = auditItems('no-vulnerable-libraries').map((item) => ({
    severity: String(item.severity ?? ''),
    library: String(item.detectedLib?.text ?? item.detectedLib?.url ?? ''),
    vuln_count: Number(item.vulnCount ?? 0)
  }));

  const jsLibItems = auditItems('js-libraries').map((item) => ({
    name: String(item.name ?? ''),
    version: item.version != null ? String(item.version) : null,
    npm: item.npm != null ? String(item.npm) : null
  }));

  return {
    deprecated_apis: {
      passing: auditScore('uses-deprecated-api'),
      items: deprecatedItems
    },
    errors_in_console: {
      passing: auditScore('errors-in-console'),
      count: consoleItems.length
    },
    no_document_write: {
      passing: auditScore('no-document-write')
    },
    vulnerable_libraries: {
      passing: auditScore('no-vulnerable-libraries'),
      items: vulnerableItems
    },
    js_libraries: {
      items: jsLibItems
    }
  };
}

let lighthouseRunChain = Promise.resolve();

async function runWithLighthouseLock(task) {
  const previous = lighthouseRunChain;
  let release;
  lighthouseRunChain = new Promise((resolve) => {
    release = resolve;
  });

  await previous;

  try {
    return await task();
  } finally {
    release();
  }
}

function toScorePercent(rawScore) {
  if (rawScore === null || rawScore === undefined || Number.isNaN(Number(rawScore))) {
    return null;
  }

  const score = Number(rawScore);
  if (score <= 1) {
    return Math.round(score * 100);
  }

  return Math.round(score);
}

function deriveCoreWebVitalsStatus(rawResult) {
  const lcp = rawResult?.audits?.['largest-contentful-paint']?.score;
  const cls = rawResult?.audits?.['cumulative-layout-shift']?.score;
  const inp =
    rawResult?.audits?.['interaction-to-next-paint']?.score ??
    rawResult?.audits?.['total-blocking-time']?.score;

  const values = [lcp, cls, inp].filter((value) => typeof value === 'number');
  if (values.length === 0) {
    return 'unknown';
  }

  if (values.some((value) => value < 0.5)) {
    return 'poor';
  }

  if (values.some((value) => value < 0.9)) {
    return 'needs_improvement';
  }

  return 'good';
}

function parseLighthouseResult(url, rawResult) {
  return {
    url,
    lighthouse_performance: toScorePercent(rawResult?.categories?.performance?.score),
    lighthouse_accessibility: toScorePercent(rawResult?.categories?.accessibility?.score),
    lighthouse_best_practices: toScorePercent(rawResult?.categories?.['best-practices']?.score),
    lighthouse_seo: toScorePercent(rawResult?.categories?.seo?.score),
    lighthouse_pwa: toScorePercent(rawResult?.categories?.pwa?.score),
    core_web_vitals_status: deriveCoreWebVitalsStatus(rawResult),
    lcp_value_ms: rawResult?.audits?.['largest-contentful-paint']?.numericValue ?? null,
    total_byte_weight: rawResult?.audits?.['total-byte-weight']?.numericValue ?? null,
    detected_technologies: detectTechnologies(rawResult),
    code_quality_audits: extractCodeQualityAudits(rawResult),
    raw: rawResult
  };
}

async function runLiveLighthouse(url, executionOptions = {}) {
  const chrome = await launch({
    chromePath: process.env.CHROME_PATH,
    chromeFlags: [
      '--headless=new',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer'
    ]
  });

  try {
    const result = await lighthouse(url, {
      port: chrome.port,
      output: 'json',
      logLevel: 'error',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      ...executionOptions
    });

    return result?.lhr ?? result;
  } finally {
    await chrome.kill();
  }
}

export async function runLighthouseScan(url, options = {}) {
  const { runImpl, executionOptions = {} } = options;

  const raw =
    typeof runImpl === 'function'
      ? await runImpl(url, executionOptions)
      : await runWithLighthouseLock(() => runLiveLighthouse(url, executionOptions));
  return parseLighthouseResult(url, raw);
}

export {
  parseLighthouseResult,
  deriveCoreWebVitalsStatus,
  toScorePercent,
  runLiveLighthouse,
  runWithLighthouseLock
};
