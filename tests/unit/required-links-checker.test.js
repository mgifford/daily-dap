import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REQUIRED_LINK_PATHS,
  REQUIRED_LINK_META,
  checkRequiredLink,
  checkAllRequiredLinks,
  checkRequiredLinks,
  buildRequiredLinksSummary
} from '../../src/scanners/required-links-checker.js';

// ---------------------------------------------------------------------------
// REQUIRED_LINK_PATHS
// ---------------------------------------------------------------------------

test('REQUIRED_LINK_PATHS has privacy paths', () => {
  assert.ok(Array.isArray(REQUIRED_LINK_PATHS.privacy));
  assert.ok(REQUIRED_LINK_PATHS.privacy.includes('/privacy'));
  assert.ok(REQUIRED_LINK_PATHS.privacy.includes('/privacy-policy'));
});

test('REQUIRED_LINK_PATHS has contact paths', () => {
  assert.ok(Array.isArray(REQUIRED_LINK_PATHS.contact));
  assert.ok(REQUIRED_LINK_PATHS.contact.includes('/contact'));
  assert.ok(REQUIRED_LINK_PATHS.contact.includes('/contact-us'));
});

test('REQUIRED_LINK_PATHS has foia paths', () => {
  assert.ok(Array.isArray(REQUIRED_LINK_PATHS.foia));
  assert.ok(REQUIRED_LINK_PATHS.foia.includes('/foia'));
  assert.ok(REQUIRED_LINK_PATHS.foia.includes('/freedom-of-information'));
});

// ---------------------------------------------------------------------------
// REQUIRED_LINK_META
// ---------------------------------------------------------------------------

test('REQUIRED_LINK_META has privacy label', () => {
  assert.equal(REQUIRED_LINK_META.privacy.label, 'Privacy Policy');
  assert.ok(REQUIRED_LINK_META.privacy.policy_ref.includes('M-17-06'));
});

test('REQUIRED_LINK_META has contact label', () => {
  assert.equal(REQUIRED_LINK_META.contact.label, 'Contact Page');
});

test('REQUIRED_LINK_META has foia label', () => {
  assert.equal(REQUIRED_LINK_META.foia.label, 'FOIA Page');
  assert.ok(REQUIRED_LINK_META.foia.policy_ref.includes('5 U.S.C. 552'));
});

// ---------------------------------------------------------------------------
// checkRequiredLink -- mock mode
// ---------------------------------------------------------------------------

test('checkRequiredLink returns found:true via runImpl', async () => {
  const result = await checkRequiredLink('https://example.gov', 'privacy', {
    runImpl: async (baseUrl, linkType) => ({
      found: true,
      url: `${baseUrl}/${linkType}`
    })
  });
  assert.equal(result.found, true);
  assert.equal(result.url, 'https://example.gov/privacy');
});

test('checkRequiredLink returns found:false via runImpl', async () => {
  const result = await checkRequiredLink('https://noprivacy.gov', 'privacy', {
    runImpl: async () => ({ found: false, url: null })
  });
  assert.equal(result.found, false);
  assert.equal(result.url, null);
});

test('checkRequiredLink passes baseUrl and linkType to runImpl', async () => {
  let receivedBase;
  let receivedType;
  await checkRequiredLink('https://agency.gov', 'foia', {
    runImpl: async (baseUrl, linkType) => {
      receivedBase = baseUrl;
      receivedType = linkType;
      return { found: false, url: null };
    }
  });
  assert.equal(receivedBase, 'https://agency.gov');
  assert.equal(receivedType, 'foia');
});

test('checkRequiredLink returns found:false for unknown linkType', async () => {
  const result = await checkRequiredLink('https://example.gov', 'nonexistent', {});
  assert.equal(result.found, false);
  assert.equal(result.url, null);
});

// ---------------------------------------------------------------------------
// checkAllRequiredLinks -- mock mode
// ---------------------------------------------------------------------------

test('checkAllRequiredLinks returns results for all link types', async () => {
  const result = await checkAllRequiredLinks('https://example.gov', {
    runImpl: async (baseUrl, linkType) => ({
      found: linkType !== 'foia',
      url: linkType !== 'foia' ? `${baseUrl}/${linkType}` : null
    })
  });
  assert.equal(result.privacy.found, true);
  assert.equal(result.contact.found, true);
  assert.equal(result.foia.found, false);
  assert.equal(result.foia.url, null);
});

test('checkAllRequiredLinks includes privacy, contact, foia keys', async () => {
  const result = await checkAllRequiredLinks('https://example.gov', {
    runImpl: async () => ({ found: false, url: null })
  });
  assert.ok('privacy' in result);
  assert.ok('contact' in result);
  assert.ok('foia' in result);
});

// ---------------------------------------------------------------------------
// checkRequiredLinks -- domain-level aggregation
// ---------------------------------------------------------------------------

test('checkRequiredLinks returns empty object for empty results', async () => {
  const result = await checkRequiredLinks([], {
    runImpl: async () => ({ found: false, url: null })
  });
  assert.deepEqual(result, {});
});

test('checkRequiredLinks returns empty object for null input', async () => {
  const result = await checkRequiredLinks(null, {
    runImpl: async () => ({ found: false, url: null })
  });
  assert.deepEqual(result, {});
});

test('checkRequiredLinks only checks successful scan results', async () => {
  const checked = [];
  const urlResults = [
    { url: 'https://ok.gov/', scan_status: 'success' },
    { url: 'https://fail.gov/', scan_status: 'failed' },
    { url: 'https://excluded.gov/', scan_status: 'excluded' }
  ];
  await checkRequiredLinks(urlResults, {
    runImpl: async (baseUrl) => {
      checked.push(baseUrl);
      return { found: false, url: null };
    }
  });
  assert.equal(checked.filter((u) => new URL(u).hostname === 'ok.gov').length >= 1, true);
  assert.equal(checked.some((u) => new URL(u).hostname === 'fail.gov'), false);
  assert.equal(checked.some((u) => new URL(u).hostname === 'excluded.gov'), false);
});

test('checkRequiredLinks deduplicates domains', async () => {
  const checked = [];
  const urlResults = [
    { url: 'https://agency.gov/page1', scan_status: 'success' },
    { url: 'https://agency.gov/page2', scan_status: 'success' },
    { url: 'https://agency.gov/page3', scan_status: 'success' }
  ];
  await checkRequiredLinks(urlResults, {
    runImpl: async (baseUrl) => {
      checked.push(baseUrl);
      return { found: false, url: null };
    }
  });
  // agency.gov should only be checked once per link type (3 types * 1 domain = 3 calls)
  const uniqueBases = new Set(checked);
  assert.equal(uniqueBases.size, 1);
  assert.ok([...uniqueBases][0] === 'https://agency.gov');
});

test('checkRequiredLinks returns results keyed by hostname', async () => {
  const urlResults = [
    { url: 'https://agency.gov/home', scan_status: 'success' }
  ];
  const result = await checkRequiredLinks(urlResults, {
    runImpl: async () => ({ found: true, url: 'https://agency.gov/privacy' })
  });
  assert.ok('agency.gov' in result);
  assert.ok('privacy' in result['agency.gov']);
});

test('checkRequiredLinks skips results without url field', async () => {
  const checked = [];
  const urlResults = [
    { scan_status: 'success' },
    { url: 'https://valid.gov/', scan_status: 'success' }
  ];
  await checkRequiredLinks(urlResults, {
    runImpl: async (baseUrl) => {
      checked.push(baseUrl);
      return { found: false, url: null };
    }
  });
  assert.equal(checked.filter((u) => new URL(u).hostname === 'valid.gov').length >= 1, true);
});

test('checkRequiredLinks tolerates malformed URLs', async () => {
  const urlResults = [
    { url: 'not-a-valid-url', scan_status: 'success' },
    { url: 'https://good.gov/', scan_status: 'success' }
  ];
  // Should not throw
  const result = await checkRequiredLinks(urlResults, {
    runImpl: async () => ({ found: false, url: null })
  });
  assert.ok('good.gov' in result);
  assert.equal(Object.keys(result).includes('not-a-valid-url'), false);
});

// ---------------------------------------------------------------------------
// buildRequiredLinksSummary
// ---------------------------------------------------------------------------

test('buildRequiredLinksSummary returns zeroed summary for empty object', () => {
  const result = buildRequiredLinksSummary({});
  assert.equal(result.domains_checked, 0);
  assert.equal(result.fully_compliant_domains, 0);
  assert.equal(result.fully_compliant_rate_percent, 0);
});

test('buildRequiredLinksSummary handles null input', () => {
  const result = buildRequiredLinksSummary(null);
  assert.equal(result.domains_checked, 0);
  assert.equal(result.fully_compliant_domains, 0);
});

test('buildRequiredLinksSummary counts domains correctly', () => {
  const linkResults = {
    'a.gov': {
      privacy: { found: true, url: 'https://a.gov/privacy' },
      contact: { found: true, url: 'https://a.gov/contact' },
      foia: { found: false, url: null }
    },
    'b.gov': {
      privacy: { found: true, url: 'https://b.gov/privacy' },
      contact: { found: false, url: null },
      foia: { found: true, url: 'https://b.gov/foia' }
    }
  };
  const result = buildRequiredLinksSummary(linkResults);
  assert.equal(result.domains_checked, 2);
  assert.equal(result.by_type.privacy.domains_with_link, 2);
  assert.equal(result.by_type.contact.domains_with_link, 1);
  assert.equal(result.by_type.foia.domains_with_link, 1);
});

test('buildRequiredLinksSummary calculates 100% when all have all links', () => {
  const linkResults = {
    'a.gov': {
      privacy: { found: true, url: 'https://a.gov/privacy' },
      contact: { found: true, url: 'https://a.gov/contact' },
      foia: { found: true, url: 'https://a.gov/foia' }
    }
  };
  const result = buildRequiredLinksSummary(linkResults);
  assert.equal(result.fully_compliant_rate_percent, 100);
  assert.equal(result.fully_compliant_domains, 1);
  assert.equal(result.by_type.privacy.rate_percent, 100);
});

test('buildRequiredLinksSummary calculates 0% when none have any links', () => {
  const linkResults = {
    'a.gov': {
      privacy: { found: false, url: null },
      contact: { found: false, url: null },
      foia: { found: false, url: null }
    }
  };
  const result = buildRequiredLinksSummary(linkResults);
  assert.equal(result.fully_compliant_rate_percent, 0);
  assert.equal(result.by_type.privacy.rate_percent, 0);
});

test('buildRequiredLinksSummary sorts missing_domains alphabetically', () => {
  const linkResults = {
    'z.gov': {
      privacy: { found: false, url: null },
      contact: { found: false, url: null },
      foia: { found: false, url: null }
    },
    'a.gov': {
      privacy: { found: false, url: null },
      contact: { found: false, url: null },
      foia: { found: false, url: null }
    }
  };
  const result = buildRequiredLinksSummary(linkResults);
  assert.deepEqual(result.by_type.privacy.missing_domains, ['a.gov', 'z.gov']);
});

test('buildRequiredLinksSummary sorts link_urls alphabetically', () => {
  const linkResults = {
    'z.gov': {
      privacy: { found: true, url: 'https://z.gov/privacy' },
      contact: { found: false, url: null },
      foia: { found: false, url: null }
    },
    'a.gov': {
      privacy: { found: true, url: 'https://a.gov/privacy' },
      contact: { found: false, url: null },
      foia: { found: false, url: null }
    }
  };
  const result = buildRequiredLinksSummary(linkResults);
  assert.deepEqual(result.by_type.privacy.link_urls, [
    'https://a.gov/privacy',
    'https://z.gov/privacy'
  ]);
});

test('buildRequiredLinksSummary fully_compliant_domains counts only fully-compliant domains', () => {
  const linkResults = {
    'full.gov': {
      privacy: { found: true, url: 'https://full.gov/privacy' },
      contact: { found: true, url: 'https://full.gov/contact' },
      foia: { found: true, url: 'https://full.gov/foia' }
    },
    'partial.gov': {
      privacy: { found: true, url: 'https://partial.gov/privacy' },
      contact: { found: false, url: null },
      foia: { found: false, url: null }
    },
    'none.gov': {
      privacy: { found: false, url: null },
      contact: { found: false, url: null },
      foia: { found: false, url: null }
    }
  };
  const result = buildRequiredLinksSummary(linkResults);
  assert.equal(result.fully_compliant_domains, 1);
  assert.equal(result.domains_checked, 3);
  assert.ok(result.fully_compliant_rate_percent > 0);
  assert.ok(result.fully_compliant_rate_percent < 100);
});
