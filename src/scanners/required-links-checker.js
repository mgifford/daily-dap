/**
 * Required Federal Links Checker
 *
 * Detects whether federal websites publish the page links required by
 * OMB Memorandum M-17-06 "Policies for Federal Agency Public Websites
 * and Digital Services" and reinforced by the 21st Century Integrated
 * Digital Experience Act (21st Century IDEA, Public Law 115-336).
 *
 * M-17-06 requires all federal agency public-facing websites to provide
 * links to the following pages:
 *   - Privacy Policy  (required by OMB M-03-22 and M-17-06 Section 1.d)
 *   - Contact information (required by M-17-06 Section 1.b)
 *   - Freedom of Information Act (FOIA) page (required by FOIA, 5 U.S.C. 552)
 *
 * The 21st Century IDEA Act (Section 3(e)) also requires an
 * Accessibility Statement, which is tracked separately in
 * src/scanners/accessibility-statement-checker.js.
 *
 * This module was added to extend Daily DAP with the types of compliance
 * checks benchmarked by the performance.gov federal website performance
 * initiative (/cx/websiteperformance/), which is no longer actively maintained
 * but whose required-links criteria remain in force under the statutes and
 * OMB policy cited above.
 *
 * Detection probes common URL paths for each required page type on each
 * unique domain in the scan results using lightweight HTTP HEAD requests.
 *
 * Paths checked per link type:
 *   Privacy Policy:  /privacy, /privacy-policy, /privacy.html,
 *                    /privacy-policy.html, /about/privacy
 *   Contact:         /contact, /contact-us, /contact.html,
 *                    /contact-us.html, /about/contact
 *   FOIA:            /foia, /freedom-of-information, /foia.html,
 *                    /foia/request-records
 */

import https from 'node:https';
import http from 'node:http';

/**
 * URL paths to probe for each required link type.
 * Ordered by prevalence on federal websites.
 */
export const REQUIRED_LINK_PATHS = {
  privacy: [
    '/privacy',
    '/privacy-policy',
    '/privacy.html',
    '/privacy-policy.html',
    '/about/privacy'
  ],
  contact: [
    '/contact',
    '/contact-us',
    '/contact.html',
    '/contact-us.html',
    '/about/contact'
  ],
  foia: [
    '/foia',
    '/freedom-of-information',
    '/foia.html',
    '/foia/request-records'
  ]
};

/**
 * Human-readable labels and policy references for each required link type.
 */
export const REQUIRED_LINK_META = {
  privacy: {
    label: 'Privacy Policy',
    policy_ref: 'OMB M-03-22 / M-17-06'
  },
  contact: {
    label: 'Contact Page',
    policy_ref: 'OMB M-17-06'
  },
  foia: {
    label: 'FOIA Page',
    policy_ref: '5 U.S.C. 552'
  }
};

/**
 * Make a HEAD request to a URL and return true if the server responds
 * with a 2xx or 3xx status.
 *
 * @param {string} urlString
 * @param {number} [timeoutMs=5000]
 * @returns {Promise<boolean>}
 */
function headRequest(urlString, timeoutMs = 5000) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(urlString);
      const client = parsed.protocol === 'https:' ? https : http;
      const options = {
        method: 'HEAD',
        hostname: parsed.hostname,
        port: parsed.port ? Number(parsed.port) : undefined,
        path: parsed.pathname + parsed.search,
        headers: {
          'User-Agent': 'daily-dap/required-links-checker 1.0'
        }
      };
      const req = client.request(options, (res) => {
        const code = res.statusCode ?? 0;
        resolve(code >= 200 && code < 400);
      });
      req.setTimeout(timeoutMs, () => {
        req.destroy();
        resolve(false);
      });
      req.on('error', () => resolve(false));
      req.end();
    } catch {
      resolve(false);
    }
  });
}

/**
 * Check whether the website at baseUrl publishes a specific required link.
 *
 * Probes each path in REQUIRED_LINK_PATHS[linkType] in order and returns the
 * first URL that responds successfully. If none do, returns
 * `{ found: false, url: null }`.
 *
 * In test / mock mode pass `options.runImpl` to replace the live HEAD request
 * logic with a custom function:
 *   `runImpl(baseUrl, linkType)` should return `{ found, url }`.
 *
 * @param {string} baseUrl - Scheme + host of the site (e.g. "https://example.gov")
 * @param {'privacy'|'contact'|'foia'} linkType
 * @param {{ runImpl?: (baseUrl: string, linkType: string) => Promise<{found: boolean, url: string|null}> }} [options]
 * @returns {Promise<{ found: boolean, url: string|null }>}
 */
export async function checkRequiredLink(baseUrl, linkType, options = {}) {
  const { runImpl } = options;
  if (typeof runImpl === 'function') {
    return runImpl(baseUrl, linkType);
  }

  const paths = REQUIRED_LINK_PATHS[linkType];
  if (!paths) {
    return { found: false, url: null };
  }

  const parsed = new URL(baseUrl);
  const base = `${parsed.protocol}//${parsed.host}`;

  for (const urlPath of paths) {
    const candidateUrl = `${base}${urlPath}`;
    // eslint-disable-next-line no-await-in-loop
    const exists = await headRequest(candidateUrl);
    if (exists) {
      return { found: true, url: candidateUrl };
    }
  }

  return { found: false, url: null };
}

/**
 * Check all required links for the website at baseUrl.
 *
 * @param {string} baseUrl
 * @param {{ runImpl?: Function }} [options]
 * @returns {Promise<{ privacy: {found: boolean, url: string|null}, contact: {found: boolean, url: string|null}, foia: {found: boolean, url: string|null} }>}
 */
export async function checkAllRequiredLinks(baseUrl, options = {}) {
  const linkTypes = Object.keys(REQUIRED_LINK_PATHS);
  const results = {};
  for (const linkType of linkTypes) {
    // eslint-disable-next-line no-await-in-loop
    results[linkType] = await checkRequiredLink(baseUrl, linkType, options);
  }
  return results;
}

/**
 * Check required links for all unique domains found in the URL results.
 *
 * Only domains from successfully-scanned URLs are checked. Each unique
 * hostname is checked exactly once regardless of how many scanned pages
 * belong to that domain.
 *
 * @param {Array<{ url?: string, scan_status: string }>} urlResults
 * @param {{ runImpl?: Function }} [options]
 * @returns {Promise<Record<string, { privacy: {found: boolean, url: string|null}, contact: {found: boolean, url: string|null}, foia: {found: boolean, url: string|null} }>>}
 */
export async function checkRequiredLinks(urlResults, options = {}) {
  const domainMap = new Map();
  for (const result of urlResults ?? []) {
    if (result?.scan_status !== 'success' || !result?.url) {
      continue;
    }
    try {
      const parsed = new URL(result.url);
      if (!domainMap.has(parsed.host)) {
        domainMap.set(parsed.host, `${parsed.protocol}//${parsed.host}`);
      }
    } catch {
      // Skip malformed URLs
    }
  }

  const linkResults = {};
  for (const [hostname, baseUrl] of domainMap) {
    // eslint-disable-next-line no-await-in-loop
    linkResults[hostname] = await checkAllRequiredLinks(baseUrl, options);
  }

  return linkResults;
}

/**
 * Build a summary object from required links check results.
 *
 * @param {Record<string, { privacy: {found: boolean, url: string|null}, contact: {found: boolean, url: string|null}, foia: {found: boolean, url: string|null} }>} linkResults
 * @returns {{
 *   domains_checked: number,
 *   by_type: Record<string, { domains_with_link: number, rate_percent: number, missing_domains: string[], link_urls: string[] }>,
 *   fully_compliant_domains: number,
 *   fully_compliant_rate_percent: number
 * }}
 */
export function buildRequiredLinksSummary(linkResults) {
  const entries = Object.entries(linkResults ?? {});
  const domainsChecked = entries.length;
  const linkTypes = Object.keys(REQUIRED_LINK_PATHS);

  const byType = {};
  for (const linkType of linkTypes) {
    const withLink = entries.filter(([, v]) => v[linkType]?.found);
    const missingDomains = entries
      .filter(([, v]) => !v[linkType]?.found)
      .map(([hostname]) => hostname)
      .sort();
    const linkUrls = withLink
      .map(([, v]) => v[linkType]?.url)
      .filter(Boolean)
      .sort();

    byType[linkType] = {
      domains_with_link: withLink.length,
      rate_percent:
        domainsChecked > 0 ? Math.round((withLink.length / domainsChecked) * 100) : 0,
      missing_domains: missingDomains,
      link_urls: linkUrls
    };
  }

  // Fully compliant = has all required link types
  const fullyCompliant = entries.filter(([, v]) =>
    linkTypes.every((type) => v[type]?.found)
  ).length;

  return {
    domains_checked: domainsChecked,
    by_type: byType,
    fully_compliant_domains: fullyCompliant,
    fully_compliant_rate_percent:
      domainsChecked > 0 ? Math.round((fullyCompliant / domainsChecked) * 100) : 0
  };
}
