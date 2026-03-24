import test from 'node:test';
import assert from 'node:assert/strict';
import { detectTechnologies, buildTechSummary } from '../../src/scanners/tech-detector.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLhr(requestUrls = []) {
  return {
    audits: {
      'network-requests': {
        details: {
          items: requestUrls.map((url) => ({ url }))
        }
      }
    }
  };
}

// ---------------------------------------------------------------------------
// detectTechnologies – null / empty input
// ---------------------------------------------------------------------------

test('detectTechnologies returns nulls for null input', () => {
  const result = detectTechnologies(null);
  assert.equal(result.cms, null);
  assert.equal(result.uswds.detected, false);
  assert.equal(result.uswds.version, null);
});

test('detectTechnologies returns nulls when network-requests audit is missing', () => {
  const result = detectTechnologies({});
  assert.equal(result.cms, null);
  assert.equal(result.uswds.detected, false);
});

test('detectTechnologies returns nulls for empty request list', () => {
  const result = detectTechnologies(makeLhr([]));
  assert.equal(result.cms, null);
  assert.equal(result.uswds.detected, false);
});

// ---------------------------------------------------------------------------
// CMS detection
// ---------------------------------------------------------------------------

test('detectTechnologies detects WordPress via /wp-content/', () => {
  const lhr = makeLhr([
    'https://example.gov/wp-content/themes/federal/style.css',
    'https://example.gov/main.js'
  ]);
  const result = detectTechnologies(lhr);
  assert.equal(result.cms, 'WordPress');
});

test('detectTechnologies detects WordPress via /wp-includes/', () => {
  const lhr = makeLhr(['https://example.gov/wp-includes/js/wp-emoji.min.js']);
  assert.equal(detectTechnologies(lhr).cms, 'WordPress');
});

test('detectTechnologies detects Drupal via /sites/default/files/', () => {
  const lhr = makeLhr(['https://example.gov/sites/default/files/css/style.css']);
  assert.equal(detectTechnologies(lhr).cms, 'Drupal');
});

test('detectTechnologies detects Drupal via /core/misc/', () => {
  const lhr = makeLhr([
    'https://example.gov/core/misc/drupal.js',
    'https://example.gov/core/themes/stable/css/base.css'
  ]);
  assert.equal(detectTechnologies(lhr).cms, 'Drupal');
});

test('detectTechnologies detects Joomla via /components/com_', () => {
  const lhr = makeLhr(['https://example.gov/components/com_content/views/article.php']);
  assert.equal(detectTechnologies(lhr).cms, 'Joomla');
});

test('detectTechnologies detects Joomla via /media/system/js/', () => {
  const lhr = makeLhr(['https://example.gov/media/system/js/core.js']);
  assert.equal(detectTechnologies(lhr).cms, 'Joomla');
});

test('detectTechnologies returns null CMS for unrecognised URLs', () => {
  const lhr = makeLhr([
    'https://example.gov/assets/css/main.css',
    'https://cdn.example.gov/lib/react.min.js'
  ]);
  assert.equal(detectTechnologies(lhr).cms, null);
});

// ---------------------------------------------------------------------------
// USWDS detection
// ---------------------------------------------------------------------------

test('detectTechnologies detects USWDS from filename', () => {
  const lhr = makeLhr(['https://example.gov/assets/uswds/uswds.min.css']);
  const result = detectTechnologies(lhr);
  assert.equal(result.uswds.detected, true);
});

test('detectTechnologies extracts USWDS version from @-notation URL', () => {
  const lhr = makeLhr(['https://unpkg.com/uswds@3.8.0/dist/css/uswds.min.css']);
  const result = detectTechnologies(lhr);
  assert.equal(result.uswds.detected, true);
  assert.equal(result.uswds.version, '3.8.0');
});

test('detectTechnologies extracts USWDS version from hyphen-separated filename', () => {
  const lhr = makeLhr(['https://example.gov/assets/uswds/uswds-3.6.1.min.css']);
  const result = detectTechnologies(lhr);
  assert.equal(result.uswds.detected, true);
  assert.equal(result.uswds.version, '3.6.1');
});

test('detectTechnologies extracts USWDS version from dot-separated filename', () => {
  const lhr = makeLhr(['https://example.gov/js/uswds.3.5.0.min.js']);
  const result = detectTechnologies(lhr);
  assert.equal(result.uswds.detected, true);
  assert.equal(result.uswds.version, '3.5.0');
});

test('detectTechnologies detects USWDS without version when only base name present', () => {
  const lhr = makeLhr(['https://example.gov/assets/uswds/uswds.min.js']);
  const result = detectTechnologies(lhr);
  assert.equal(result.uswds.detected, true);
  assert.equal(result.uswds.version, null);
});

test('detectTechnologies does not detect USWDS for unrelated URLs', () => {
  const lhr = makeLhr(['https://example.gov/assets/css/styles.min.css']);
  assert.equal(detectTechnologies(lhr).uswds.detected, false);
});

// ---------------------------------------------------------------------------
// Combined CMS + USWDS
// ---------------------------------------------------------------------------

test('detectTechnologies can detect both CMS and USWDS simultaneously', () => {
  const lhr = makeLhr([
    'https://example.gov/sites/default/files/css/main.css',
    'https://example.gov/assets/uswds/uswds-3.8.0.min.css'
  ]);
  const result = detectTechnologies(lhr);
  assert.equal(result.cms, 'Drupal');
  assert.equal(result.uswds.detected, true);
  assert.equal(result.uswds.version, '3.8.0');
});

// ---------------------------------------------------------------------------
// buildTechSummary
// ---------------------------------------------------------------------------

test('buildTechSummary returns zeroed summary for empty results', () => {
  const summary = buildTechSummary([]);
  assert.deepEqual(summary.cms_counts, {});
  assert.deepEqual(summary.cms_urls, {});
  assert.equal(summary.uswds_count, 0);
  assert.deepEqual(summary.uswds_versions, []);
  assert.deepEqual(summary.uswds_version_urls, {});
  assert.equal(summary.total_scanned, 0);
});

test('buildTechSummary counts CMS occurrences across successful results', () => {
  const results = [
    { scan_status: 'success', detected_technologies: { cms: 'WordPress', uswds: { detected: false, version: null } } },
    { scan_status: 'success', detected_technologies: { cms: 'WordPress', uswds: { detected: false, version: null } } },
    { scan_status: 'success', detected_technologies: { cms: 'Drupal', uswds: { detected: false, version: null } } },
    { scan_status: 'failed', detected_technologies: { cms: 'Joomla', uswds: { detected: false, version: null } } }
  ];
  const summary = buildTechSummary(results);
  assert.equal(summary.cms_counts.WordPress, 2);
  assert.equal(summary.cms_counts.Drupal, 1);
  assert.equal(summary.cms_counts.Joomla, undefined, 'failed results should not be counted');
  assert.equal(summary.total_scanned, 3);
});

test('buildTechSummary tracks cms_urls per platform', () => {
  const results = [
    { url: 'https://wp1.gov/', scan_status: 'success', detected_technologies: { cms: 'WordPress', uswds: { detected: false, version: null } } },
    { url: 'https://wp2.gov/', scan_status: 'success', detected_technologies: { cms: 'WordPress', uswds: { detected: false, version: null } } },
    { url: 'https://drupal1.gov/', scan_status: 'success', detected_technologies: { cms: 'Drupal', uswds: { detected: false, version: null } } },
    { url: 'https://joomla1.gov/', scan_status: 'failed', detected_technologies: { cms: 'Joomla', uswds: { detected: false, version: null } } }
  ];
  const summary = buildTechSummary(results);
  assert.deepEqual(summary.cms_urls.WordPress, ['https://wp1.gov/', 'https://wp2.gov/']);
  assert.deepEqual(summary.cms_urls.Drupal, ['https://drupal1.gov/']);
  assert.equal(summary.cms_urls.Joomla, undefined, 'failed results should not appear in cms_urls');
});

test('buildTechSummary counts USWDS usage and deduplicates versions', () => {
  const results = [
    { scan_status: 'success', detected_technologies: { cms: null, uswds: { detected: true, version: '3.8.0' } } },
    { scan_status: 'success', detected_technologies: { cms: null, uswds: { detected: true, version: '3.8.0' } } },
    { scan_status: 'success', detected_technologies: { cms: null, uswds: { detected: true, version: '3.6.1' } } },
    { scan_status: 'success', detected_technologies: { cms: null, uswds: { detected: false, version: null } } }
  ];
  const summary = buildTechSummary(results);
  assert.equal(summary.uswds_count, 3);
  assert.deepEqual(summary.uswds_versions, ['3.6.1', '3.8.0']);
  assert.equal(summary.total_scanned, 4);
});

test('buildTechSummary tracks uswds_version_urls per version', () => {
  const results = [
    { url: 'https://site1.gov/', scan_status: 'success', detected_technologies: { cms: null, uswds: { detected: true, version: '3.8.0' } } },
    { url: 'https://site2.gov/', scan_status: 'success', detected_technologies: { cms: null, uswds: { detected: true, version: '3.8.0' } } },
    { url: 'https://site3.gov/', scan_status: 'success', detected_technologies: { cms: null, uswds: { detected: true, version: '3.6.1' } } },
    { url: 'https://site4.gov/', scan_status: 'success', detected_technologies: { cms: null, uswds: { detected: true, version: null } } }
  ];
  const summary = buildTechSummary(results);
  assert.deepEqual(summary.uswds_version_urls['3.8.0'], ['https://site1.gov/', 'https://site2.gov/']);
  assert.deepEqual(summary.uswds_version_urls['3.6.1'], ['https://site3.gov/']);
  assert.deepEqual(summary.uswds_version_urls[''], ['https://site4.gov/'], 'USWDS without version tracked under empty-string key');
});

test('buildTechSummary ignores results with null detected_technologies', () => {
  const results = [
    { scan_status: 'success', detected_technologies: null },
    { scan_status: 'success', detected_technologies: { cms: 'Drupal', uswds: { detected: false, version: null } } }
  ];
  const summary = buildTechSummary(results);
  assert.equal(summary.cms_counts.Drupal, 1);
  assert.equal(summary.total_scanned, 2);
});

test('buildTechSummary uswds_versions list is sorted semantically', () => {
  const results = [
    { scan_status: 'success', detected_technologies: { cms: null, uswds: { detected: true, version: '3.10.0' } } },
    { scan_status: 'success', detected_technologies: { cms: null, uswds: { detected: true, version: '3.2.1' } } },
    { scan_status: 'success', detected_technologies: { cms: null, uswds: { detected: true, version: '3.8.0' } } }
  ];
  const summary = buildTechSummary(results);
  // Semantic order: 3.2.1 < 3.8.0 < 3.10.0 (not lexicographic '3.10.0' < '3.2.1')
  assert.deepEqual(summary.uswds_versions, ['3.2.1', '3.8.0', '3.10.0']);
});

test('buildTechSummary cms_urls is empty when results lack url field', () => {
  const results = [
    { scan_status: 'success', detected_technologies: { cms: 'Drupal', uswds: { detected: false, version: null } } }
  ];
  const summary = buildTechSummary(results);
  assert.equal(summary.cms_counts.Drupal, 1);
  assert.deepEqual(summary.cms_urls, {}, 'cms_urls should be empty when no url field is present');
});
