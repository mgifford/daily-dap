/**
 * Technology detector
 *
 * Analyses Lighthouse raw results (lhr) to detect:
 *  - CMS platform: WordPress, Drupal, or Joomla
 *  - USWDS: whether the U.S. Web Design System is present, and which version
 *
 * Detection relies on URL patterns in the network-requests audit, which lists
 * every resource the browser loaded while rendering the page. This works well
 * because each CMS serves assets from characteristic URL paths, and USWDS
 * bundles are commonly served under names that include "uswds".
 */

const CMS_PATTERNS = {
  WordPress: [
    /\/wp-content\//i,
    /\/wp-includes\//i,
    /\/wp-json\//i,
    /wp-embed\.min\.js/i,
    /wp-emoji/i,
    /\/wp-login\.php/i
  ],
  Drupal: [
    /\/sites\/default\/files\//i,
    /\/sites\/all\/(modules|themes|libraries)\//i,
    /\/core\/(misc|themes|modules)\//i,
    /\/misc\/drupal\.js/i,
    /drupal\.min\.js(\?|$)/i,
    /drupal\.js(\?|$)/i
  ],
  Joomla: [
    /\/components\/com_/i,
    /\/media\/system\/js\//i,
    /\/media\/jui\/js\//i,
    /\/media\/cms\/js\//i,
    /joomla\.js(\?|$)/i
  ]
};

const USWDS_URL_PATTERN = /uswds/i;

/**
 * Try to extract a semver version string from a USWDS asset URL.
 *
 * Handles formats like:
 *   uswds@3.8.0          (npm CDN / unpkg)
 *   uswds-3.8.0.min.css  (file name with hyphen separator)
 *   uswds.3.8.0.min.js   (file name with dot separator)
 *   uswds-3.8            (major.minor only)
 *
 * @param {string} url
 * @returns {string|null}
 */
function extractUswdsVersion(url) {
  const patterns = [
    /@(\d+\.\d+\.\d+)/,            // uswds@3.8.0
    /uswds[._-](\d+\.\d+\.\d+)/i,  // uswds-3.8.0 / uswds.3.8.0
    /uswds[._-](\d+\.\d+)/i        // uswds-3.8 / uswds.3.8
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Extract the list of request URLs from a Lighthouse result.
 *
 * @param {object|null} lighthouseRaw
 * @returns {string[]}
 */
function extractRequestUrls(lighthouseRaw) {
  const items = lighthouseRaw?.audits?.['network-requests']?.details?.items ?? [];
  return items.map((item) => item.url ?? '').filter(Boolean);
}

/**
 * Detect technologies from a Lighthouse raw result (lhr).
 *
 * @param {object|null} lighthouseRaw - Full Lighthouse result object (lhr)
 * @returns {{ cms: string|null, uswds: { detected: boolean, version: string|null } }}
 */
export function detectTechnologies(lighthouseRaw) {
  if (!lighthouseRaw) {
    return { cms: null, uswds: { detected: false, version: null } };
  }

  const urls = extractRequestUrls(lighthouseRaw);

  // Detect CMS: return the first match
  let detectedCms = null;
  outer: for (const [cmsName, patterns] of Object.entries(CMS_PATTERNS)) {
    for (const url of urls) {
      if (patterns.some((pattern) => pattern.test(url))) {
        detectedCms = cmsName;
        break outer;
      }
    }
  }

  // Detect USWDS and attempt to extract its version
  let uswdsDetected = false;
  let uswdsVersion = null;

  for (const url of urls) {
    if (USWDS_URL_PATTERN.test(url)) {
      uswdsDetected = true;
      const version = extractUswdsVersion(url);
      if (version && !uswdsVersion) {
        uswdsVersion = version;
      }
    }
  }

  return {
    cms: detectedCms,
    uswds: { detected: uswdsDetected, version: uswdsVersion }
  };
}

/**
 * Build a technology summary across all scan results.
 *
 * Counts how many successfully-scanned URLs use each detected CMS and/or
 * USWDS. Returns counts and a deduplicated list of observed USWDS versions.
 *
 * @param {Array<{ scan_status: string, detected_technologies?: object }>} urlResults
 * @returns {{
 *   cms_counts: Record<string, number>,
 *   uswds_count: number,
 *   uswds_versions: string[],
 *   total_scanned: number
 * }}
 */
export function buildTechSummary(urlResults = []) {
  const successful = urlResults.filter((r) => r?.scan_status === 'success');
  const cmsCounts = {};
  let uswdsCount = 0;
  const uswdsVersionSet = new Set();

  for (const result of successful) {
    const tech = result.detected_technologies;
    if (!tech) {
      continue;
    }

    if (tech.cms) {
      cmsCounts[tech.cms] = (cmsCounts[tech.cms] ?? 0) + 1;
    }

    if (tech.uswds?.detected) {
      uswdsCount += 1;
      if (tech.uswds.version) {
        uswdsVersionSet.add(tech.uswds.version);
      }
    }
  }

  return {
    cms_counts: cmsCounts,
    uswds_count: uswdsCount,
    uswds_versions: [...uswdsVersionSet].sort(),
    total_scanned: successful.length
  };
}
