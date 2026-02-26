import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';

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
