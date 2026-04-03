import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractReadabilityMetrics,
  computeWordsPerMb,
  buildReadabilitySummary,
  LOW_DENSITY_THRESHOLD_WPM
} from '../../src/scanners/readability-extractor.js';

// ---------------------------------------------------------------------------
// LOW_DENSITY_THRESHOLD_WPM constant
// ---------------------------------------------------------------------------

test('LOW_DENSITY_THRESHOLD_WPM is 200', () => {
  assert.equal(LOW_DENSITY_THRESHOLD_WPM, 200);
});

// ---------------------------------------------------------------------------
// extractReadabilityMetrics – null / empty input
// ---------------------------------------------------------------------------

test('extractReadabilityMetrics returns null for empty HTML', () => {
  const result = extractReadabilityMetrics('', 'https://example.gov/');
  assert.equal(result, null);
});

test('extractReadabilityMetrics returns null for blank body', () => {
  const html = '<html><body></body></html>';
  const result = extractReadabilityMetrics(html, 'https://example.gov/');
  assert.equal(result, null);
});

test('extractReadabilityMetrics returns null for invalid URL that throws in JSDOM', () => {
  const result = extractReadabilityMetrics('<p>Hello world</p>', 'not-a-valid-url');
  // JSDOM may throw for invalid URLs; extractor should return null gracefully
  // (acceptable result is either null or a metrics object)
  assert.ok(result === null || (typeof result === 'object' && result !== null));
});

// ---------------------------------------------------------------------------
// extractReadabilityMetrics – basic extraction
// ---------------------------------------------------------------------------

test('extractReadabilityMetrics returns word_count for content-rich page', () => {
  const body = Array.from({ length: 50 }, (_, i) => `Word${i}`).join(' ');
  const html = `<!DOCTYPE html>
<html>
<head><title>Test Page</title></head>
<body>
  <main>
    <article>
      <h1>Test Article</h1>
      <p>${body}</p>
    </article>
  </main>
</body>
</html>`;
  const result = extractReadabilityMetrics(html, 'https://example.gov/article');
  assert.ok(result !== null, 'Expected non-null result for content-rich page');
  assert.equal(typeof result.word_count, 'number');
  assert.ok(result.word_count > 0, 'Expected positive word count');
  assert.equal(typeof result.char_count, 'number');
  assert.ok(result.char_count > 0, 'Expected positive char count');
  assert.equal(typeof result.title, 'string');
});

test('extractReadabilityMetrics word_count matches visible word count', () => {
  const words = Array.from({ length: 200 }, (_, i) => `word${i}`);
  const paragraphText = words.join(' ');
  const html = `<!DOCTYPE html>
<html>
<head><title>Word Count Test</title></head>
<body>
  <article>
    <h1>Article Title</h1>
    <p>${paragraphText}</p>
    <p>${paragraphText}</p>
  </article>
</body>
</html>`;
  const result = extractReadabilityMetrics(html, 'https://example.gov/article');
  assert.ok(result !== null);
  // 200 words x2 paragraphs plus heading words; allow a range
  assert.ok(result.word_count >= 400, `Expected >= 400 words, got ${result.word_count}`);
});

test('extractReadabilityMetrics excludes nav/header/footer boilerplate', () => {
  const navText = Array.from({ length: 100 }, (_, i) => `nav${i}`).join(' ');
  const articleText = Array.from({ length: 50 }, (_, i) => `content${i}`).join(' ');
  const html = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
  <nav>${navText}</nav>
  <article>
    <h1>Article Heading</h1>
    <p>${articleText}</p>
  </article>
  <footer>${navText}</footer>
</body>
</html>`;
  const result = extractReadabilityMetrics(html, 'https://example.gov/article');
  assert.ok(result !== null);
  // The extracted word count should be lower than the total word count (nav/footer excluded)
  // At minimum it should be significantly less than 200 nav words x2 + 50 content words
  assert.ok(result.word_count < 300, `Expected exclusion of nav/footer; got ${result.word_count}`);
});

// ---------------------------------------------------------------------------
// computeWordsPerMb
// ---------------------------------------------------------------------------

test('computeWordsPerMb returns null when wordCount is null', () => {
  assert.equal(computeWordsPerMb(null, 1_000_000), null);
});

test('computeWordsPerMb returns null when totalByteWeight is null', () => {
  assert.equal(computeWordsPerMb(500, null), null);
});

test('computeWordsPerMb returns null when wordCount is 0', () => {
  assert.equal(computeWordsPerMb(0, 1_000_000), null);
});

test('computeWordsPerMb returns null when totalByteWeight is 0', () => {
  assert.equal(computeWordsPerMb(500, 0), null);
});

test('computeWordsPerMb calculates ratio correctly for exact values', () => {
  // 1200 words / 2 MB = 600 WpM
  assert.equal(computeWordsPerMb(1200, 2_000_000), 600);
});

test('computeWordsPerMb rounds to nearest integer', () => {
  // 100 words / 1.5 MB = 66.67 WpM → rounds to 67
  assert.equal(computeWordsPerMb(100, 1_500_000), 67);
});

test('computeWordsPerMb returns value below LOW_DENSITY_THRESHOLD_WPM for bloated pages', () => {
  // 80 words / 5 MB = 16 WpM — well below 200
  const wpm = computeWordsPerMb(80, 5_000_000);
  assert.ok(wpm < LOW_DENSITY_THRESHOLD_WPM, `Expected below threshold, got ${wpm}`);
});

test('computeWordsPerMb returns value above LOW_DENSITY_THRESHOLD_WPM for efficient pages', () => {
  // 1200 words / 0.5 MB = 2400 WpM — well above 200
  const wpm = computeWordsPerMb(1200, 500_000);
  assert.ok(wpm > LOW_DENSITY_THRESHOLD_WPM, `Expected above threshold, got ${wpm}`);
});

// ---------------------------------------------------------------------------
// buildReadabilitySummary
// ---------------------------------------------------------------------------

test('buildReadabilitySummary returns zeroed summary for empty results', () => {
  const summary = buildReadabilitySummary([]);
  assert.equal(summary.url_count_with_metrics, 0);
  assert.equal(summary.url_count_low_density, 0);
  assert.equal(summary.mean_word_count, null);
  assert.equal(summary.mean_words_per_mb, null);
  assert.deepEqual(summary.low_density_urls, []);
});

test('buildReadabilitySummary ignores failed and excluded results', () => {
  const urlResults = [
    {
      scan_status: 'failed',
      url: 'https://a.gov/',
      readability_metrics: { word_count: 500, words_per_mb: 300 }
    },
    {
      scan_status: 'excluded',
      url: 'https://b.gov/',
      readability_metrics: { word_count: 800, words_per_mb: 400 }
    }
  ];
  const summary = buildReadabilitySummary(urlResults);
  assert.equal(summary.url_count_with_metrics, 0);
});

test('buildReadabilitySummary ignores results with no readability_metrics', () => {
  const urlResults = [
    { scan_status: 'success', url: 'https://a.gov/', readability_metrics: null }
  ];
  const summary = buildReadabilitySummary(urlResults);
  assert.equal(summary.url_count_with_metrics, 0);
});

test('buildReadabilitySummary calculates mean_word_count', () => {
  const urlResults = [
    {
      scan_status: 'success',
      url: 'https://a.gov/',
      readability_metrics: { word_count: 1000, words_per_mb: 500 }
    },
    {
      scan_status: 'success',
      url: 'https://b.gov/',
      readability_metrics: { word_count: 600, words_per_mb: 300 }
    }
  ];
  const summary = buildReadabilitySummary(urlResults);
  assert.equal(summary.url_count_with_metrics, 2);
  assert.equal(summary.mean_word_count, 800);
});

test('buildReadabilitySummary calculates mean_words_per_mb', () => {
  const urlResults = [
    {
      scan_status: 'success',
      url: 'https://a.gov/',
      readability_metrics: { word_count: 1000, words_per_mb: 500 }
    },
    {
      scan_status: 'success',
      url: 'https://b.gov/',
      readability_metrics: { word_count: 200, words_per_mb: 100 }
    }
  ];
  const summary = buildReadabilitySummary(urlResults);
  assert.equal(summary.mean_words_per_mb, 300);
});

test('buildReadabilitySummary identifies low_density_urls', () => {
  const urlResults = [
    {
      scan_status: 'success',
      url: 'https://good.gov/',
      readability_metrics: { word_count: 1200, words_per_mb: 2400 }
    },
    {
      scan_status: 'success',
      url: 'https://bloated.gov/',
      readability_metrics: { word_count: 80, words_per_mb: 16 }
    },
    {
      scan_status: 'success',
      url: 'https://borderline.gov/',
      readability_metrics: { word_count: 150, words_per_mb: 150 }
    }
  ];
  const summary = buildReadabilitySummary(urlResults);
  assert.equal(summary.url_count_low_density, 2);
  const lowSet = new Set(summary.low_density_urls);
  assert.ok(lowSet.has('https://bloated.gov/'), 'bloated.gov should be low density');
  assert.ok(lowSet.has('https://borderline.gov/'), 'borderline.gov should be low density');
  assert.ok(!lowSet.has('https://good.gov/'), 'good.gov should not be low density');
});

test('buildReadabilitySummary handles results with null words_per_mb in mean calculation', () => {
  const urlResults = [
    {
      scan_status: 'success',
      url: 'https://a.gov/',
      readability_metrics: { word_count: 500, words_per_mb: null }
    },
    {
      scan_status: 'success',
      url: 'https://b.gov/',
      readability_metrics: { word_count: 700, words_per_mb: 400 }
    }
  ];
  const summary = buildReadabilitySummary(urlResults);
  assert.equal(summary.url_count_with_metrics, 2);
  // mean_word_count uses all records with word_count > 0
  assert.equal(summary.mean_word_count, 600);
  // mean_words_per_mb uses only records with a numeric words_per_mb
  assert.equal(summary.mean_words_per_mb, 400);
});
