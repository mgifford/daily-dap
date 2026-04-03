import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

/**
 * Words-per-Megabyte threshold below which a page is flagged for
 * "Optimization Review" (Digital Bloat).
 *
 * Pages below this ratio are sending disproportionately large amounts of
 * data relative to the textual content they deliver to readers.
 */
export const LOW_DENSITY_THRESHOLD_WPM = 200;

/**
 * Extract main-content word and character counts from raw HTML using
 * @mozilla/readability to strip navigation, sidebars, and ads.
 *
 * Returns null when Readability cannot identify article content
 * (e.g. very short or login-gated pages).
 *
 * @param {string} html - Raw HTML string for the page.
 * @param {string} url  - Source URL; used by Readability to resolve relative links.
 * @returns {{ title: string, word_count: number, char_count: number } | null}
 */
export function extractReadabilityMetrics(html, url) {
  let dom;
  try {
    dom = new JSDOM(html, { url });
  } catch {
    return null;
  }

  const reader = new Readability(dom.window.document);
  let article;
  try {
    article = reader.parse();
  } catch {
    return null;
  }

  if (!article || !article.textContent) {
    return null;
  }

  const cleanText = article.textContent.trim();
  if (!cleanText) {
    return null;
  }

  const wordCount = cleanText.split(/\s+/).filter((word) => word.length > 0).length;

  return {
    title: article.title ?? '',
    word_count: wordCount,
    char_count: cleanText.length
  };
}

/**
 * Calculate Words-per-Megabyte efficiency ratio.
 *
 * Uses total page weight (all resources, as measured by Lighthouse) rather
 * than just the HTML document size, so the ratio reflects the true cost
 * of delivering content to the reader.
 *
 * @param {number|null} wordCount       - Extracted word count.
 * @param {number|null} totalByteWeight - Total page resource weight in bytes.
 * @returns {number|null} Rounded integer ratio, or null when inputs are unavailable.
 */
export function computeWordsPerMb(wordCount, totalByteWeight) {
  if (
    typeof wordCount !== 'number' ||
    wordCount <= 0 ||
    typeof totalByteWeight !== 'number' ||
    totalByteWeight <= 0
  ) {
    return null;
  }

  const totalMb = totalByteWeight / 1_000_000;
  return Math.round(wordCount / totalMb);
}

/**
 * Fetch a URL and extract readability metrics from the response HTML.
 * Uses the native Node.js fetch API (requires Node >= 18).
 *
 * @param {string} url
 * @returns {Promise<{ title: string, word_count: number, char_count: number } | null>}
 */
export async function fetchAndExtractReadability(url) {
  let response;
  try {
    response = await fetch(url, {
      headers: { 'Accept': 'text/html' },
      redirect: 'follow'
    });
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  let html;
  try {
    html = await response.text();
  } catch {
    return null;
  }

  return extractReadabilityMetrics(html, url);
}

/**
 * Aggregate readability metrics across all successfully scanned URL results.
 *
 * @param {Array} urlResults - Normalized URL scan results.
 * @returns {object} Aggregated summary.
 */
export function buildReadabilitySummary(urlResults = []) {
  const withMetrics = urlResults.filter(
    (r) =>
      r?.scan_status === 'success' &&
      typeof r.readability_metrics?.word_count === 'number' &&
      r.readability_metrics.word_count > 0
  );

  if (withMetrics.length === 0) {
    return {
      url_count_with_metrics: 0,
      url_count_low_density: 0,
      mean_word_count: null,
      mean_words_per_mb: null,
      low_density_urls: []
    };
  }

  const totalWords = withMetrics.reduce((sum, r) => sum + r.readability_metrics.word_count, 0);
  const meanWordCount = Math.round(totalWords / withMetrics.length);

  const withRatio = withMetrics.filter(
    (r) => typeof r.readability_metrics.words_per_mb === 'number'
  );

  const meanWordsPerMb =
    withRatio.length > 0
      ? Math.round(
          withRatio.reduce((sum, r) => sum + r.readability_metrics.words_per_mb, 0) /
            withRatio.length
        )
      : null;

  const lowDensityUrls = withRatio
    .filter((r) => r.readability_metrics.words_per_mb < LOW_DENSITY_THRESHOLD_WPM)
    .map((r) => r.url);

  return {
    url_count_with_metrics: withMetrics.length,
    url_count_low_density: lowDensityUrls.length,
    mean_word_count: meanWordCount,
    mean_words_per_mb: meanWordsPerMb,
    low_density_urls: lowDensityUrls
  };
}
