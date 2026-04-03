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
 * Minimum word count from Readability below which a DOM-based full-body
 * extraction is used as a fallback.  Portal and homepage-style pages often
 * have meaningful content that Readability (designed for article pages) misses
 * entirely, returning only a handful of words instead of the full visible text.
 */
const MIN_READABILITY_WORDS = 50;

/**
 * Extract all visible text from the DOM by removing script/style/template
 * elements and reading body.textContent.  Used as a fallback when Readability
 * cannot identify enough article content on a page.
 *
 * @param {Document} document - A JSDOM Document.
 * @returns {{ word_count: number, char_count: number } | null}
 */
function extractDomTextMetrics(document) {
  const body = document.body;
  if (!body) return null;

  // Clone the body so we can safely remove non-visible elements without
  // mutating the passed document.
  const clone = body.cloneNode(true);

  // Strip elements that do not contribute to visible text.
  for (const tag of ['script', 'style', 'noscript', 'template']) {
    for (const el of clone.querySelectorAll(tag)) {
      el.remove();
    }
  }

  const rawText = clone.textContent ?? '';
  const cleanText = rawText.replace(/\s+/g, ' ').trim();
  if (!cleanText) return null;

  const wordCount = cleanText.split(' ').filter((w) => w.length > 0).length;
  return { word_count: wordCount, char_count: cleanText.length };
}

/**
 * Extract main-content word and character counts from raw HTML.
 *
 * First attempts @mozilla/readability (best for article/blog pages).
 * Falls back to full DOM-based extraction when Readability cannot identify
 * sufficient content (e.g. portal pages, homepages, or login-gated pages)
 * so that word counts are not artificially low.
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

  // --- Readability pass ---
  // Readability mutates the document it receives; that is acceptable here
  // because we only re-use the original HTML string (not the DOM) if the
  // DOM fallback is needed.
  const reader = new Readability(dom.window.document);
  let article;
  try {
    article = reader.parse();
  } catch {
    article = null;
  }

  const readabilityText = article?.textContent?.trim() ?? '';
  const readabilityWordCount = readabilityText
    ? readabilityText.split(/\s+/).filter((w) => w.length > 0).length
    : 0;

  // --- DOM fallback pass ---
  // Use the full-body extraction when Readability fails completely or returns
  // very few words.  This covers portal pages, dashboards, and homepages where
  // Readability finds no "article" but the page still has substantial text.
  // Re-parse the original HTML so the fallback sees an unmodified document
  // (Readability mutated the one above).
  let domMetrics = null;
  if (readabilityWordCount < MIN_READABILITY_WORDS) {
    let fallbackDom;
    try {
      fallbackDom = new JSDOM(html, { url });
    } catch {
      fallbackDom = null;
    }
    if (fallbackDom) {
      domMetrics = extractDomTextMetrics(fallbackDom.window.document);
    }
  }

  // Choose the best available result.
  const domWordCount = domMetrics?.word_count ?? 0;
  if (domWordCount > readabilityWordCount) {
    return {
      title: article?.title ?? '',
      word_count: domMetrics.word_count,
      char_count: domMetrics.char_count
    };
  }

  if (readabilityWordCount === 0) {
    return null;
  }

  return {
    title: article?.title ?? '',
    word_count: readabilityWordCount,
    char_count: readabilityText.length
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
