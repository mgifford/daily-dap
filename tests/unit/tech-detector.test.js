import test from 'node:test';
import assert from 'node:assert/strict';
import { detectTechnologies, buildTechSummary, getThirdPartyServiceMeta, OVERLAY_SIGNATURES } from '../../src/scanners/tech-detector.js';

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

// ---------------------------------------------------------------------------
// Third-party service detection
// ---------------------------------------------------------------------------

test('detectTechnologies returns empty third_party_services for null input', () => {
  const result = detectTechnologies(null);
  assert.deepEqual(result.third_party_services, []);
});

test('detectTechnologies returns empty third_party_services for empty request list', () => {
  const result = detectTechnologies(makeLhr([]));
  assert.deepEqual(result.third_party_services, []);
});

test('detectTechnologies detects Google Analytics via google-analytics.com', () => {
  const lhr = makeLhr(['https://www.google-analytics.com/analytics.js']);
  const result = detectTechnologies(lhr);
  assert.ok(result.third_party_services.includes('Google Analytics'));
});

test('detectTechnologies detects Google Analytics via googletagmanager.com gtag', () => {
  const lhr = makeLhr(['https://www.googletagmanager.com/gtag/js?id=UA-12345']);
  const result = detectTechnologies(lhr);
  assert.ok(result.third_party_services.includes('Google Analytics'));
});

test('detectTechnologies detects Google Tag Manager separately from Analytics', () => {
  const lhr = makeLhr(['https://www.googletagmanager.com/gtm.js?id=GTM-ABC123']);
  const result = detectTechnologies(lhr);
  assert.ok(result.third_party_services.includes('Google Tag Manager'));
  assert.ok(!result.third_party_services.includes('Google Analytics'), 'GTM alone should not trigger Analytics');
});

test('detectTechnologies detects Digital Analytics Program', () => {
  const lhr = makeLhr(['https://dap.digitalgov.gov/Universal-Federated-Analytics-Min.js']);
  const result = detectTechnologies(lhr);
  assert.ok(result.third_party_services.includes('Digital Analytics Program'));
});

test('detectTechnologies detects Adobe Analytics via adobedtm.com', () => {
  const lhr = makeLhr(['https://assets.adobedtm.com/launch-EN123.min.js']);
  const result = detectTechnologies(lhr);
  assert.ok(result.third_party_services.includes('Adobe Analytics'));
});

test('detectTechnologies detects YouTube embed', () => {
  const lhr = makeLhr(['https://www.youtube.com/embed/abc123']);
  const result = detectTechnologies(lhr);
  assert.ok(result.third_party_services.includes('YouTube'));
});

test('detectTechnologies detects Google Fonts', () => {
  const lhr = makeLhr(['https://fonts.googleapis.com/css2?family=Roboto']);
  const result = detectTechnologies(lhr);
  assert.ok(result.third_party_services.includes('Google Fonts'));
});

test('detectTechnologies detects jsDelivr CDN', () => {
  const lhr = makeLhr(['https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.min.js']);
  const result = detectTechnologies(lhr);
  assert.ok(result.third_party_services.includes('jsDelivr CDN'));
});

test('detectTechnologies detects Facebook / Meta Pixel', () => {
  const lhr = makeLhr(['https://connect.facebook.net/en_US/fbevents.js']);
  const result = detectTechnologies(lhr);
  assert.ok(result.third_party_services.includes('Facebook / Meta Pixel'));
});

test('detectTechnologies detects Login.gov', () => {
  const lhr = makeLhr(['https://secure.login.gov/api/openid_connect/authorize']);
  const result = detectTechnologies(lhr);
  // CodeQL[js/incomplete-url-substring-sanitization]: third_party_services is an
  // array of service name strings, not a URL string; this is an array membership
  // check, not URL substring sanitization.
  assert.ok(result.third_party_services.includes('Login.gov'));
});

test('detectTechnologies does not produce false positives for unrelated URLs', () => {
  const lhr = makeLhr([
    'https://example.gov/assets/css/main.css',
    'https://cdn.example.gov/lib/react.min.js'
  ]);
  const result = detectTechnologies(lhr);
  assert.deepEqual(result.third_party_services, []);
});

test('detectTechnologies detects multiple third-party services on same page', () => {
  const lhr = makeLhr([
    'https://www.googletagmanager.com/gtm.js?id=GTM-ABC',
    'https://fonts.googleapis.com/css2?family=Open+Sans',
    'https://cdn.jsdelivr.net/npm/chart.js@4.0.0/dist/chart.min.js',
    'https://dap.digitalgov.gov/Universal-Federated-Analytics-Min.js'
  ]);
  const result = detectTechnologies(lhr);
  assert.ok(result.third_party_services.includes('Google Tag Manager'));
  assert.ok(result.third_party_services.includes('Google Fonts'));
  assert.ok(result.third_party_services.includes('jsDelivr CDN'));
  assert.ok(result.third_party_services.includes('Digital Analytics Program'));
});

// ---------------------------------------------------------------------------
// getThirdPartyServiceMeta
// ---------------------------------------------------------------------------

test('getThirdPartyServiceMeta returns category and privacy_concern for known service', () => {
  const meta = getThirdPartyServiceMeta('Google Analytics');
  assert.equal(meta.category, 'analytics');
  assert.equal(meta.privacy_concern, true);
});

test('getThirdPartyServiceMeta returns privacy_concern false for Digital Analytics Program', () => {
  const meta = getThirdPartyServiceMeta('Digital Analytics Program');
  assert.equal(meta.category, 'analytics');
  assert.equal(meta.privacy_concern, false);
});

test('getThirdPartyServiceMeta returns privacy_concern false for jsDelivr CDN', () => {
  const meta = getThirdPartyServiceMeta('jsDelivr CDN');
  assert.equal(meta.category, 'cdn');
  assert.equal(meta.privacy_concern, false);
});

test('getThirdPartyServiceMeta returns null for unknown service', () => {
  assert.equal(getThirdPartyServiceMeta('UnknownService'), null);
});

// ---------------------------------------------------------------------------
// buildTechSummary third-party aggregation
// ---------------------------------------------------------------------------

test('buildTechSummary returns empty third_party fields for empty results', () => {
  const summary = buildTechSummary([]);
  assert.deepEqual(summary.third_party_service_counts, {});
  assert.deepEqual(summary.third_party_service_urls, {});
});

test('buildTechSummary aggregates third_party_service_counts across successful results', () => {
  const results = [
    {
      scan_status: 'success',
      detected_technologies: {
        cms: null,
        uswds: { detected: false, version: null },
        third_party_services: ['Google Analytics', 'Google Fonts']
      }
    },
    {
      scan_status: 'success',
      detected_technologies: {
        cms: null,
        uswds: { detected: false, version: null },
        third_party_services: ['Google Analytics']
      }
    },
    {
      scan_status: 'failed',
      detected_technologies: {
        cms: null,
        uswds: { detected: false, version: null },
        third_party_services: ['Google Analytics']
      }
    }
  ];
  const summary = buildTechSummary(results);
  assert.equal(summary.third_party_service_counts['Google Analytics'], 2);
  assert.equal(summary.third_party_service_counts['Google Fonts'], 1);
  assert.equal(summary.third_party_service_counts['Google Analytics'], 2, 'only successful scans should be counted');
});

test('buildTechSummary tracks third_party_service_urls per service', () => {
  const results = [
    {
      url: 'https://site1.gov/',
      scan_status: 'success',
      detected_technologies: {
        cms: null,
        uswds: { detected: false, version: null },
        third_party_services: ['Google Analytics', 'Google Fonts']
      }
    },
    {
      url: 'https://site2.gov/',
      scan_status: 'success',
      detected_technologies: {
        cms: null,
        uswds: { detected: false, version: null },
        third_party_services: ['Google Analytics']
      }
    }
  ];
  const summary = buildTechSummary(results);
  assert.deepEqual(summary.third_party_service_urls['Google Analytics'], ['https://site1.gov/', 'https://site2.gov/']);
  assert.deepEqual(summary.third_party_service_urls['Google Fonts'], ['https://site1.gov/']);
});

test('buildTechSummary handles results with no third_party_services field', () => {
  const results = [
    {
      url: 'https://site1.gov/',
      scan_status: 'success',
      detected_technologies: { cms: 'Drupal', uswds: { detected: false, version: null } }
    }
  ];
  const summary = buildTechSummary(results);
  assert.deepEqual(summary.third_party_service_counts, {});
  assert.deepEqual(summary.third_party_service_urls, {});
  assert.equal(summary.cms_counts.Drupal, 1);
});

// ---------------------------------------------------------------------------
// third_party_service_sizes – detectTechnologies
// ---------------------------------------------------------------------------

test('detectTechnologies returns empty third_party_service_sizes for null input', () => {
  const result = detectTechnologies(null);
  assert.deepEqual(result.third_party_service_sizes, {});
});

test('detectTechnologies returns empty third_party_service_sizes when no services match', () => {
  const lhr = {
    audits: {
      'network-requests': {
        details: {
          items: [{ url: 'https://example.gov/main.js', transferSize: 10000 }]
        }
      }
    }
  };
  const result = detectTechnologies(lhr);
  assert.deepEqual(result.third_party_service_sizes, {});
});

test('detectTechnologies captures transfer size for a matched third-party service', () => {
  const lhr = {
    audits: {
      'network-requests': {
        details: {
          items: [
            { url: 'https://www.googletagmanager.com/gtag/js?id=G-123', transferSize: 30720 }
          ]
        }
      }
    }
  };
  const result = detectTechnologies(lhr);
  assert.ok(result.third_party_services.includes('Google Analytics'));
  assert.equal(result.third_party_service_sizes['Google Analytics'], 30720);
});

test('detectTechnologies sums transfer sizes when multiple URLs match the same service', () => {
  const lhr = {
    audits: {
      'network-requests': {
        details: {
          items: [
            { url: 'https://www.google-analytics.com/analytics.js', transferSize: 20480 },
            { url: 'https://www.googletagmanager.com/gtag/js?id=G-123', transferSize: 10240 }
          ]
        }
      }
    }
  };
  const result = detectTechnologies(lhr);
  assert.equal(result.third_party_service_sizes['Google Analytics'], 30720);
});

test('detectTechnologies ignores items with zero or missing transferSize', () => {
  const lhr = {
    audits: {
      'network-requests': {
        details: {
          items: [
            { url: 'https://www.googletagmanager.com/gtag/js?id=G-123', transferSize: 0 },
            { url: 'https://www.google-analytics.com/analytics.js' }
          ]
        }
      }
    }
  };
  const result = detectTechnologies(lhr);
  assert.ok(result.third_party_services.includes('Google Analytics'));
  assert.equal(result.third_party_service_sizes['Google Analytics'], undefined);
});

// ---------------------------------------------------------------------------
// third_party_service_total_bytes – buildTechSummary
// ---------------------------------------------------------------------------

test('buildTechSummary returns empty third_party_service_total_bytes for empty results', () => {
  const summary = buildTechSummary([]);
  assert.deepEqual(summary.third_party_service_total_bytes, {});
});

test('buildTechSummary aggregates third_party_service_total_bytes across successful results', () => {
  const results = [
    {
      scan_status: 'success',
      detected_technologies: {
        cms: null,
        uswds: { detected: false, version: null },
        third_party_services: ['Google Analytics', 'Google Fonts'],
        third_party_service_sizes: { 'Google Analytics': 30720, 'Google Fonts': 5120 }
      }
    },
    {
      scan_status: 'success',
      detected_technologies: {
        cms: null,
        uswds: { detected: false, version: null },
        third_party_services: ['Google Analytics'],
        third_party_service_sizes: { 'Google Analytics': 20480 }
      }
    },
    {
      scan_status: 'failed',
      detected_technologies: {
        cms: null,
        uswds: { detected: false, version: null },
        third_party_services: ['Google Analytics'],
        third_party_service_sizes: { 'Google Analytics': 99999 }
      }
    }
  ];
  const summary = buildTechSummary(results);
  assert.equal(summary.third_party_service_total_bytes['Google Analytics'], 51200);
  assert.equal(summary.third_party_service_total_bytes['Google Fonts'], 5120);
  assert.equal(summary.third_party_service_total_bytes['YouTube'], undefined);
});

test('buildTechSummary handles results with no third_party_service_sizes field', () => {
  const results = [
    {
      scan_status: 'success',
      detected_technologies: {
        cms: null,
        uswds: { detected: false, version: null },
        third_party_services: ['Google Analytics']
      }
    }
  ];
  const summary = buildTechSummary(results);
  assert.equal(summary.third_party_service_counts['Google Analytics'], 1);
  assert.deepEqual(summary.third_party_service_total_bytes, {});
});

// ---------------------------------------------------------------------------
// third_party_service_page_load_totals – buildTechSummary
// ---------------------------------------------------------------------------

test('buildTechSummary returns empty third_party_service_page_load_totals for empty results', () => {
  const summary = buildTechSummary([]);
  assert.deepEqual(summary.third_party_service_page_load_totals, {});
});

test('buildTechSummary accumulates page_load_count per service across successful results', () => {
  const results = [
    {
      url: 'https://site1.gov/',
      page_load_count: 5000000,
      scan_status: 'success',
      detected_technologies: {
        cms: null,
        uswds: { detected: false, version: null },
        third_party_services: ['Google Analytics', 'Google Fonts'],
        third_party_service_sizes: { 'Google Analytics': 30720, 'Google Fonts': 5120 }
      }
    },
    {
      url: 'https://site2.gov/',
      page_load_count: 2000000,
      scan_status: 'success',
      detected_technologies: {
        cms: null,
        uswds: { detected: false, version: null },
        third_party_services: ['Google Analytics'],
        third_party_service_sizes: { 'Google Analytics': 20480 }
      }
    },
    {
      url: 'https://site3.gov/',
      page_load_count: 999999,
      scan_status: 'failed',
      detected_technologies: {
        cms: null,
        uswds: { detected: false, version: null },
        third_party_services: ['Google Analytics'],
        third_party_service_sizes: { 'Google Analytics': 99999 }
      }
    }
  ];
  const summary = buildTechSummary(results);
  assert.equal(summary.third_party_service_page_load_totals['Google Analytics'], 7000000);
  assert.equal(summary.third_party_service_page_load_totals['Google Fonts'], 5000000);
  assert.equal(summary.third_party_service_page_load_totals['YouTube'], undefined);
});

test('buildTechSummary treats missing page_load_count as 0 in page load totals', () => {
  const results = [
    {
      url: 'https://site1.gov/',
      scan_status: 'success',
      detected_technologies: {
        cms: null,
        uswds: { detected: false, version: null },
        third_party_services: ['Google Analytics']
      }
    },
    {
      url: 'https://site2.gov/',
      page_load_count: 3000000,
      scan_status: 'success',
      detected_technologies: {
        cms: null,
        uswds: { detected: false, version: null },
        third_party_services: ['Google Analytics']
      }
    }
  ];
  const summary = buildTechSummary(results);
  assert.equal(summary.third_party_service_page_load_totals['Google Analytics'], 3000000);
});

// ---------------------------------------------------------------------------
// OVERLAY_SIGNATURES export
// ---------------------------------------------------------------------------

test('OVERLAY_SIGNATURES is an array with at least one entry', () => {
  assert.ok(Array.isArray(OVERLAY_SIGNATURES));
  assert.ok(OVERLAY_SIGNATURES.length > 0);
});

test('OVERLAY_SIGNATURES entries each have a name and patterns array', () => {
  for (const entry of OVERLAY_SIGNATURES) {
    assert.equal(typeof entry.name, 'string', `${entry.name}: name should be a string`);
    assert.ok(Array.isArray(entry.patterns), `${entry.name}: patterns should be an array`);
    assert.ok(entry.patterns.length > 0, `${entry.name}: patterns should be non-empty`);
  }
});

test('OVERLAY_SIGNATURES includes AccessiBe', () => {
  assert.ok(OVERLAY_SIGNATURES.some((o) => o.name === 'AccessiBe'));
});

test('OVERLAY_SIGNATURES includes AudioEye', () => {
  assert.ok(OVERLAY_SIGNATURES.some((o) => o.name === 'AudioEye'));
});

test('OVERLAY_SIGNATURES includes UserWay', () => {
  assert.ok(OVERLAY_SIGNATURES.some((o) => o.name === 'UserWay'));
});

// ---------------------------------------------------------------------------
// detectTechnologies – overlays field
// ---------------------------------------------------------------------------

test('detectTechnologies returns empty overlays for null input', () => {
  const result = detectTechnologies(null);
  assert.deepEqual(result.overlays, []);
});

test('detectTechnologies returns empty overlays for empty request list', () => {
  const result = detectTechnologies(makeLhr([]));
  assert.deepEqual(result.overlays, []);
});

test('detectTechnologies detects AccessiBe overlay via accessibe.com domain', () => {
  const lhr = makeLhr(['https://acsbap.com/apps/app/assets/js/acsb.js']);
  const result = detectTechnologies(lhr);
  assert.ok(result.overlays.includes('AccessiBe'), 'Should detect AccessiBe via acsb.js pattern');
});

test('detectTechnologies detects AudioEye overlay via audioeye.com domain', () => {
  const lhr = makeLhr(['https://ws.audioeye.com/ae.js']);
  const result = detectTechnologies(lhr);
  assert.ok(result.overlays.includes('AudioEye'));
});

test('detectTechnologies detects UserWay overlay via userway.org domain', () => {
  const lhr = makeLhr(['https://cdn.userway.org/widget.js']);
  const result = detectTechnologies(lhr);
  assert.ok(result.overlays.includes('UserWay'));
});

test('detectTechnologies detects EqualWeb overlay via equalweb.com domain', () => {
  const lhr = makeLhr(['https://www.equalweb.com/accessibility-widget.js']);
  const result = detectTechnologies(lhr);
  assert.ok(result.overlays.includes('EqualWeb'));
});

test('detectTechnologies does not detect overlays for unrelated URLs', () => {
  const lhr = makeLhr([
    'https://example.gov/assets/main.css',
    'https://dap.digitalgov.gov/Universal-Federated-Analytics-Min.js',
    'https://fonts.googleapis.com/css2?family=Source+Sans+Pro'
  ]);
  const result = detectTechnologies(lhr);
  assert.deepEqual(result.overlays, []);
});

test('detectTechnologies detects multiple overlays when present', () => {
  const lhr = makeLhr([
    'https://cdn.userway.org/widget.js',
    'https://ws.audioeye.com/ae.js'
  ]);
  const result = detectTechnologies(lhr);
  assert.ok(result.overlays.includes('UserWay'));
  assert.ok(result.overlays.includes('AudioEye'));
});

// ---------------------------------------------------------------------------
// buildTechSummary – overlay aggregation
// ---------------------------------------------------------------------------

test('buildTechSummary returns empty overlay_counts for empty results', () => {
  const summary = buildTechSummary([]);
  assert.deepEqual(summary.overlay_counts, {});
});

test('buildTechSummary returns empty overlay_urls for empty results', () => {
  const summary = buildTechSummary([]);
  assert.deepEqual(summary.overlay_urls, {});
});

test('buildTechSummary counts overlays across successful results', () => {
  const results = [
    {
      url: 'https://site1.gov/',
      scan_status: 'success',
      detected_technologies: {
        cms: null,
        uswds: { detected: false, version: null },
        third_party_services: [],
        third_party_service_sizes: {},
        overlays: ['UserWay']
      }
    },
    {
      url: 'https://site2.gov/',
      scan_status: 'success',
      detected_technologies: {
        cms: null,
        uswds: { detected: false, version: null },
        third_party_services: [],
        third_party_service_sizes: {},
        overlays: ['UserWay', 'AudioEye']
      }
    },
    {
      url: 'https://site3.gov/',
      scan_status: 'failed',
      detected_technologies: {
        cms: null,
        uswds: { detected: false, version: null },
        third_party_services: [],
        third_party_service_sizes: {},
        overlays: ['UserWay']
      }
    }
  ];
  const summary = buildTechSummary(results);
  assert.equal(summary.overlay_counts['UserWay'], 2, 'UserWay found on 2 successful URLs');
  assert.equal(summary.overlay_counts['AudioEye'], 1);
  assert.equal(summary.overlay_counts['AccessiBe'], undefined);
});

test('buildTechSummary tracks overlay_urls per vendor', () => {
  const results = [
    {
      url: 'https://site1.gov/',
      scan_status: 'success',
      detected_technologies: {
        cms: null,
        uswds: { detected: false, version: null },
        third_party_services: [],
        third_party_service_sizes: {},
        overlays: ['UserWay']
      }
    },
    {
      url: 'https://site2.gov/',
      scan_status: 'success',
      detected_technologies: {
        cms: null,
        uswds: { detected: false, version: null },
        third_party_services: [],
        third_party_service_sizes: {},
        overlays: ['UserWay']
      }
    }
  ];
  const summary = buildTechSummary(results);
  assert.deepEqual(summary.overlay_urls['UserWay'], ['https://site1.gov/', 'https://site2.gov/']);
});

test('buildTechSummary handles results with no overlays field', () => {
  const results = [
    {
      url: 'https://site1.gov/',
      scan_status: 'success',
      detected_technologies: {
        cms: null,
        uswds: { detected: false, version: null },
        third_party_services: []
      }
    }
  ];
  const summary = buildTechSummary(results);
  assert.deepEqual(summary.overlay_counts, {});
  assert.deepEqual(summary.overlay_urls, {});
});
