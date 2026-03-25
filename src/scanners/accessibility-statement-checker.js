/**
 * Accessibility Statement Checker
 *
 * Detects whether federal websites publish a digital accessibility statement
 * as required by OMB Memorandum M-24-08 "Strengthening Digital Accessibility
 * and the Management of Section 508 of the Rehabilitation Act" (December 2023).
 *
 * M-24-08 requires each federal agency to publish an accessibility statement
 * that includes:
 *   - Contact information for reporting accessibility problems
 *   - Known accessibility limitations and alternatives
 *   - Process for requesting accessible formats or alternatives
 *   - A reference to the agency formal complaints process
 *   - A date of last review
 *   - A link to the agency Section 508 program page
 *
 * Detection works by probing common accessibility statement URL paths on each
 * unique domain in the scan results using lightweight HTTP HEAD requests.
 *
 * Paths checked (in order):
 *   /accessibility
 *   /accessibility-statement
 *   /accessibility.html
 *   /accessibility-statement.html
 *   /about/accessibility
 *   /section-508
 *   /508
 */

import https from 'node:https';
import http from 'node:http';

/**
 * Common URL paths where federal accessibility statements are published.
 * Ordered by prevalence based on observed federal website patterns.
 */
export const ACCESSIBILITY_STATEMENT_PATHS = [
  '/accessibility',
  '/accessibility-statement',
  '/accessibility.html',
  '/accessibility-statement.html',
  '/about/accessibility',
  '/section-508',
  '/508'
];

/**
 * Make a HEAD request to a URL and return true if the server responds with
 * a 2xx or 3xx status (the page exists or redirects to something that does).
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
          'User-Agent': 'daily-dap-accessibility-statement-checker/1.0'
        }
      };
      const req = client.request(options, (res) => {
        const code = res.statusCode ?? 0;
        // Accept 2xx (success) and 3xx (redirect – the path exists even if moved)
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
 * Check whether the website at baseUrl publishes an accessibility statement.
 *
 * Probes each path in ACCESSIBILITY_STATEMENT_PATHS in order and returns the
 * first URL that responds successfully.  If none do, returns
 * `{ has_statement: false, statement_url: null }`.
 *
 * In test / mock mode pass `options.runImpl` to replace the live HEAD request
 * logic with a custom function:
 *   `runImpl(baseUrl)` should return `{ has_statement, statement_url }`.
 *
 * @param {string} baseUrl - Scheme + host of the site (e.g. "https://example.gov")
 * @param {{ runImpl?: (baseUrl: string) => Promise<{has_statement: boolean, statement_url: string|null}> }} [options]
 * @returns {Promise<{ has_statement: boolean, statement_url: string|null }>}
 */
export async function checkAccessibilityStatement(baseUrl, options = {}) {
  const { runImpl } = options;
  if (typeof runImpl === 'function') {
    return runImpl(baseUrl);
  }

  const parsed = new URL(baseUrl);
  const base = `${parsed.protocol}//${parsed.host}`;

  for (const urlPath of ACCESSIBILITY_STATEMENT_PATHS) {
    const candidateUrl = `${base}${urlPath}`;
    // eslint-disable-next-line no-await-in-loop
    const exists = await headRequest(candidateUrl);
    if (exists) {
      return { has_statement: true, statement_url: candidateUrl };
    }
  }

  return { has_statement: false, statement_url: null };
}

/**
 * Check accessibility statements for all unique domains found in the URL results.
 *
 * Only domains from successfully-scanned URLs are checked.  Each unique
 * hostname is checked exactly once regardless of how many scanned pages
 * belong to that domain.
 *
 * @param {Array<{ url?: string, scan_status: string }>} urlResults
 * @param {{ runImpl?: Function }} [options]
 * @returns {Promise<Record<string, { has_statement: boolean, statement_url: string|null }>>}
 */
export async function checkAccessibilityStatements(urlResults, options = {}) {
  // Collect unique hostname → baseUrl pairs from successfully-scanned URLs
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

  const statements = {};
  for (const [hostname, baseUrl] of domainMap) {
    // eslint-disable-next-line no-await-in-loop
    statements[hostname] = await checkAccessibilityStatement(baseUrl, options);
  }

  return statements;
}

/**
 * Build a summary object from accessibility statement check results.
 *
 * @param {Record<string, { has_statement: boolean, statement_url: string|null }>} statements
 * @returns {{
 *   domains_checked: number,
 *   domains_with_statement: number,
 *   statement_rate_percent: number,
 *   domains_without_statement: string[],
 *   statement_urls: string[]
 * }}
 */
export function buildAccessibilityStatementSummary(statements) {
  const entries = Object.entries(statements ?? {});
  const withStatement = entries.filter(([, v]) => v.has_statement);
  const withoutStatement = entries
    .filter(([, v]) => !v.has_statement)
    .map(([hostname]) => hostname)
    .sort();
  const statementUrls = withStatement
    .map(([, v]) => v.statement_url)
    .filter(Boolean)
    .sort();
  const domainsChecked = entries.length;
  const domainsWithStatement = withStatement.length;

  return {
    domains_checked: domainsChecked,
    domains_with_statement: domainsWithStatement,
    statement_rate_percent:
      domainsChecked > 0 ? Math.round((domainsWithStatement / domainsChecked) * 100) : 0,
    domains_without_statement: withoutStatement,
    statement_urls: statementUrls
  };
}
