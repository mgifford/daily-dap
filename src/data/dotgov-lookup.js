/**
 * dotgov-lookup.js
 *
 * Fetches the CISA .gov registry CSV and builds a domain-to-organization
 * lookup map.  The data maps second-level .gov domains (e.g. "cfpb.gov")
 * to their registrant organization (e.g. "Consumer Financial Protection Bureau")
 * and domain type (e.g. "Federal - Executive").
 *
 * Source: https://github.com/cisagov/dotgov-data
 * File: current-federal.csv  (updated daily by CISA)
 *
 * CSV columns: Domain name, Domain type, Organization name,
 *              Suborganization name, City, State, Security contact email
 */

const CISA_CSV_URL =
  'https://raw.githubusercontent.com/cisagov/dotgov-data/main/current-federal.csv';

/** In-memory cache so the CSV is only fetched once per process. */
let cachedLookup = null;

/**
 * Split a single CSV line into fields, respecting double-quoted values.
 * @param {string} line
 * @returns {string[]}
 */
function splitCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === ',' && !inQuote) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

/**
 * Parse the CISA federal CSV text into a Map keyed by lower-case domain name.
 * @param {string} csvText
 * @returns {Map<string, {organization_name: string, domain_type: string}>}
 */
export function parseDotgovCsv(csvText) {
  const map = new Map();
  const lines = csvText.split('\n');
  // Skip header row (index 0)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const fields = splitCsvLine(line);
    if (fields.length < 3) continue;
    const domain = fields[0].trim().toLowerCase();
    const domainType = fields[1].trim();
    const orgName = fields[2].trim();
    if (!domain || !orgName) continue;
    map.set(domain, { organization_name: orgName, domain_type: domainType });
  }
  return map;
}

/**
 * Fetch CSV text from a URL using the built-in fetch API (Node >= 18).
 * @param {string} url
 * @returns {Promise<string>}
 */
async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${url}`);
  }
  return response.text();
}

/**
 * Load the .gov domain lookup map.  Results are cached after the first call.
 * Resolves to an empty Map if the network request fails.
 *
 * @returns {Promise<Map<string, {organization_name: string, domain_type: string}>>}
 */
export async function loadDotgovData() {
  if (cachedLookup !== null) {
    return cachedLookup;
  }
  try {
    const csv = await fetchText(CISA_CSV_URL);
    cachedLookup = parseDotgovCsv(csv);
  } catch {
    cachedLookup = new Map();
  }
  return cachedLookup;
}

/**
 * Look up the organization for a given hostname using a pre-loaded lookup map.
 *
 * Attempts an exact match on the full hostname, then falls back to the apex
 * domain (last two labels, e.g. "cfpb.gov" from "www.cfpb.gov").
 *
 * @param {string} hostname  - e.g. "www.cfpb.gov" or "cfpb.gov"
 * @param {Map<string, {organization_name: string, domain_type: string}>} lookup
 * @returns {{organization_name: string, domain_type: string} | null}
 */
export function lookupDomain(hostname, lookup) {
  if (!lookup || !hostname || typeof hostname !== 'string') {
    return null;
  }
  const host = hostname.toLowerCase().trim();
  if (lookup.has(host)) {
    return lookup.get(host);
  }
  // Fall back to apex domain (last two labels)
  const labels = host.split('.');
  if (labels.length > 2) {
    const apex = labels.slice(-2).join('.');
    if (lookup.has(apex)) {
      return lookup.get(apex);
    }
  }
  return null;
}

/**
 * Extract the hostname from a full URL string.
 * Returns null for invalid URLs.
 *
 * @param {string} url
 * @returns {string | null}
 */
export function hostnameFromUrl(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}
