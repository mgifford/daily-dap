/**
 * Technology detector
 *
 * Analyses Lighthouse raw results (lhr) to detect:
 *  - CMS platform: WordPress, Drupal, or Joomla
 *  - USWDS: whether the U.S. Web Design System is present, and which version
 *  - Third-party JavaScript services: analytics, advertising, social media,
 *    CDN, fonts, maps, government identity, and support tools
 *
 * Detection relies on URL patterns in the network-requests audit, which lists
 * every resource the browser loaded while rendering the page. This works well
 * because each CMS serves assets from characteristic URL paths, and USWDS
 * bundles are commonly served under names that include "uswds". Third-party
 * services are identified by their characteristic hostnames.
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
 * Known third-party JavaScript services detected from network request URLs.
 *
 * Each entry describes:
 *  - name:            Display name of the service
 *  - category:        Functional category (analytics, advertising, social,
 *                     cdn, fonts, maps, government, support)
 *  - privacy_concern: true when the service involves user tracking or sending
 *                     behavioural data to a third-party entity
 *  - patterns:        Array of RegExp patterns matched against request URLs
 */
const THIRD_PARTY_SERVICES = [
  // --- Analytics ---
  {
    name: 'Google Analytics',
    category: 'analytics',
    privacy_concern: true,
    patterns: [
      /google-analytics\.com\/(analytics|ga|gtag)\.js/i,
      /googletagmanager\.com\/gtag\/js/i
    ]
  },
  {
    name: 'Google Tag Manager',
    category: 'analytics',
    privacy_concern: true,
    patterns: [
      /googletagmanager\.com\/(gtm\.js|ns\.html)/i
    ]
  },
  {
    name: 'Digital Analytics Program',
    category: 'analytics',
    // DAP is operated by the U.S. federal government (GSA/DigitalGov) and does
    // not share data with commercial third parties. It is treated as a trusted
    // government service rather than a user-tracking concern.
    privacy_concern: false,
    patterns: [
      /dap\.digitalgov\.gov/i
    ]
  },
  {
    name: 'Adobe Analytics',
    category: 'analytics',
    privacy_concern: true,
    patterns: [
      /assets\.adobedtm\.com/i,
      /sc\.omtrdc\.net/i,
      /omniture\.com/i,
      /2o7\.net/i
    ]
  },
  {
    name: 'Hotjar',
    category: 'analytics',
    privacy_concern: true,
    patterns: [
      /static\.hotjar\.com/i,
      /vars\.hotjar\.com/i
    ]
  },
  {
    name: 'ForeSee / Verint',
    category: 'analytics',
    privacy_concern: true,
    patterns: [
      /foresee\.com/i,
      /gateway\.foresee\.com/i,
      /siteintercept\.foresee\.com/i
    ]
  },
  // --- Advertising ---
  {
    name: 'Google Ads',
    category: 'advertising',
    privacy_concern: true,
    patterns: [
      /doubleclick\.net/i,
      /googlesyndication\.com/i,
      /adservice\.google\./i,
      /googleadservices\.com/i
    ]
  },
  {
    name: 'Facebook / Meta Pixel',
    category: 'advertising',
    privacy_concern: true,
    patterns: [
      /connect\.facebook\.net/i,
      /facebook\.com\/tr(\?|\/)/i
    ]
  },
  // --- Social Media ---
  {
    name: 'YouTube',
    category: 'social',
    privacy_concern: true,
    patterns: [
      /youtube\.com\/(embed|v\/|iframe_api)/i,
      /ytimg\.com/i,
      /youtu\.be\//i
    ]
  },
  {
    name: 'Twitter / X Widgets',
    category: 'social',
    privacy_concern: true,
    patterns: [
      /platform\.twitter\.com/i,
      /platform\.x\.com/i,
      /twimg\.com/i
    ]
  },
  // --- CDN / Frameworks ---
  {
    name: 'jsDelivr CDN',
    category: 'cdn',
    privacy_concern: false,
    patterns: [
      /cdn\.jsdelivr\.net/i
    ]
  },
  {
    name: 'cdnjs',
    category: 'cdn',
    privacy_concern: false,
    patterns: [
      /cdnjs\.cloudflare\.com/i
    ]
  },
  {
    name: 'unpkg CDN',
    category: 'cdn',
    privacy_concern: false,
    patterns: [
      /unpkg\.com\//i
    ]
  },
  // --- Fonts ---
  {
    name: 'Google Fonts',
    category: 'fonts',
    privacy_concern: true,
    patterns: [
      /fonts\.googleapis\.com/i,
      /fonts\.gstatic\.com/i
    ]
  },
  {
    name: 'Adobe Fonts',
    category: 'fonts',
    privacy_concern: true,
    patterns: [
      /use\.typekit\.net/i,
      /p\.typekit\.net/i
    ]
  },
  // --- Maps ---
  {
    name: 'Google Maps',
    category: 'maps',
    privacy_concern: true,
    patterns: [
      /maps\.googleapis\.com/i,
      /maps\.gstatic\.com/i
    ]
  },
  {
    name: 'Mapbox',
    category: 'maps',
    privacy_concern: true,
    patterns: [
      /api\.mapbox\.com/i,
      /events\.mapbox\.com/i
    ]
  },
  // --- Support / Chat ---
  {
    name: 'Zendesk',
    category: 'support',
    privacy_concern: true,
    patterns: [
      /static\.zdassets\.com/i,
      /ekr\.zdassets\.com/i
    ]
  },
  // --- Government Identity ---
  {
    name: 'Login.gov',
    category: 'government',
    privacy_concern: false,
    // Patterns are anchored to the host position (//hostname/) to avoid
    // matching URLs where login.gov appears only in a path or query string.
    patterns: [
      /\/\/secure\.login\.gov\//i,
      /\/\/idp\.int\.identitysandbox\.gov\//i
    ]
  }
];

/**
 * Return metadata (category and privacy_concern) for a named third-party service.
 *
 * @param {string} name - Service name as returned by detectThirdPartyServices()
 * @returns {{ category: string, privacy_concern: boolean }|null}
 */
export function getThirdPartyServiceMeta(name) {
  const found = THIRD_PARTY_SERVICES.find((s) => s.name === name);
  if (!found) {
    return null;
  }
  return { category: found.category, privacy_concern: found.privacy_concern };
}

/**
 * Compare two semver strings semantically (e.g. 3.2.1 < 3.8.0 < 3.10.0).
 * Falls back to lexicographic comparison for non-semver strings.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function compareSemver(a, b) {
  const toNums = (v) => v.split('.').map((n) => parseInt(n, 10) || 0);
  const aNums = toNums(a);
  const bNums = toNums(b);
  const len = Math.max(aNums.length, bNums.length);
  for (let index = 0; index < len; index += 1) {
    const diff = (aNums[index] ?? 0) - (bNums[index] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
}

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
 * Extract the raw network-request items from a Lighthouse result.
 * Each item includes at minimum a `url` field and optionally `transferSize` (bytes).
 *
 * @param {object|null} lighthouseRaw
 * @returns {Array<{url?: string, transferSize?: number}>}
 */
function extractRequestItems(lighthouseRaw) {
  return lighthouseRaw?.audits?.['network-requests']?.details?.items ?? [];
}

/**
 * Extract the list of request URLs from a Lighthouse result.
 *
 * @param {object|null} lighthouseRaw
 * @returns {string[]}
 */
function extractRequestUrls(lighthouseRaw) {
  return extractRequestItems(lighthouseRaw)
    .map((item) => item.url ?? '')
    .filter(Boolean);
}

/**
 * Detect which known third-party services are loaded from a list of request URLs.
 * Each service is reported at most once regardless of how many of its patterns matched.
 *
 * @param {string[]} urls
 * @returns {string[]} Sorted list of detected service names
 */
function detectThirdPartyServices(urls) {
  const detected = [];
  for (const service of THIRD_PARTY_SERVICES) {
    if (urls.some((url) => service.patterns.some((pattern) => pattern.test(url)))) {
      detected.push(service.name);
    }
  }
  return detected;
}

/**
 * Calculate the total transfer size in bytes for each detected third-party service.
 * Sums the `transferSize` of every network-request item whose URL matches a service pattern.
 * Only items with a positive `transferSize` are counted.
 *
 * @param {Array<{url?: string, transferSize?: number}>} items
 * @returns {Record<string, number>} Map of service name → total bytes for this page
 */
function extractThirdPartyServiceSizes(items) {
  const sizes = {};
  for (const item of items) {
    const url = item.url ?? '';
    const bytes = item.transferSize ?? 0;
    if (!url || bytes <= 0) continue;
    for (const service of THIRD_PARTY_SERVICES) {
      if (service.patterns.some((pattern) => pattern.test(url))) {
        sizes[service.name] = (sizes[service.name] ?? 0) + bytes;
      }
    }
  }
  return sizes;
}

/**
 * Detect technologies from a Lighthouse raw result (lhr).
 *
 * @param {object|null} lighthouseRaw - Full Lighthouse result object (lhr)
 * @returns {{
 *   cms: string|null,
 *   uswds: { detected: boolean, version: string|null },
 *   third_party_services: string[],
 *   third_party_service_sizes: Record<string, number>
 * }}
 */
export function detectTechnologies(lighthouseRaw) {
  if (!lighthouseRaw) {
    return {
      cms: null,
      uswds: { detected: false, version: null },
      third_party_services: [],
      third_party_service_sizes: {}
    };
  }

  const items = extractRequestItems(lighthouseRaw);
  const urls = items.map((item) => item.url ?? '').filter(Boolean);

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
    uswds: { detected: uswdsDetected, version: uswdsVersion },
    third_party_services: detectThirdPartyServices(urls),
    third_party_service_sizes: extractThirdPartyServiceSizes(items)
  };
}

/**
 * Build a technology summary across all scan results.
 *
 * Counts how many successfully-scanned URLs use each detected CMS and/or
 * USWDS. Returns counts and a deduplicated list of observed USWDS versions.
 * Also aggregates third-party service usage and transfer sizes across all scanned URLs.
 *
 * @param {Array<{ scan_status: string, detected_technologies?: object, page_load_count?: number }>} urlResults
 * @returns {{
 *   cms_counts: Record<string, number>,
 *   uswds_count: number,
 *   uswds_versions: string[],
 *   total_scanned: number,
 *   third_party_service_counts: Record<string, number>,
 *   third_party_service_urls: Record<string, string[]>,
 *   third_party_service_total_bytes: Record<string, number>,
 *   third_party_service_page_load_totals: Record<string, number>
 * }}
 */
export function buildTechSummary(urlResults = []) {
  const successful = urlResults.filter((r) => r?.scan_status === 'success');
  const cmsCounts = {};
  const cmsUrls = {};
  let uswdsCount = 0;
  const uswdsVersionSet = new Set();
  const uswdsVersionUrls = {};
  const thirdPartyServiceCounts = {};
  const thirdPartyServiceUrls = {};
  const thirdPartyServiceTotalBytes = {};
  const thirdPartyServicePageLoadTotals = {};

  for (const result of successful) {
    const tech = result.detected_technologies;
    if (!tech) {
      continue;
    }

    const url = result.url ?? null;
    const pageLoadCount = result.page_load_count ?? 0;

    if (tech.cms) {
      cmsCounts[tech.cms] = (cmsCounts[tech.cms] ?? 0) + 1;
      if (url) {
        if (!cmsUrls[tech.cms]) cmsUrls[tech.cms] = [];
        cmsUrls[tech.cms].push(url);
      }
    }

    if (tech.uswds?.detected) {
      uswdsCount += 1;
      const ver = tech.uswds.version ?? '';
      if (ver) {
        uswdsVersionSet.add(ver);
      }
      if (url) {
        if (!uswdsVersionUrls[ver]) uswdsVersionUrls[ver] = [];
        uswdsVersionUrls[ver].push(url);
      }
    }

    for (const serviceName of (tech.third_party_services ?? [])) {
      thirdPartyServiceCounts[serviceName] = (thirdPartyServiceCounts[serviceName] ?? 0) + 1;
      if (url) {
        if (!thirdPartyServiceUrls[serviceName]) thirdPartyServiceUrls[serviceName] = [];
        thirdPartyServiceUrls[serviceName].push(url);
      }
      thirdPartyServicePageLoadTotals[serviceName] =
        (thirdPartyServicePageLoadTotals[serviceName] ?? 0) + pageLoadCount;
    }

    const sizes = tech.third_party_service_sizes ?? {};
    for (const [serviceName, bytes] of Object.entries(sizes)) {
      if (bytes > 0) {
        thirdPartyServiceTotalBytes[serviceName] =
          (thirdPartyServiceTotalBytes[serviceName] ?? 0) + bytes;
      }
    }
  }

  return {
    cms_counts: cmsCounts,
    cms_urls: cmsUrls,
    uswds_count: uswdsCount,
    uswds_versions: [...uswdsVersionSet].sort(compareSemver),
    uswds_version_urls: uswdsVersionUrls,
    total_scanned: successful.length,
    third_party_service_counts: thirdPartyServiceCounts,
    third_party_service_urls: thirdPartyServiceUrls,
    third_party_service_total_bytes: thirdPartyServiceTotalBytes,
    third_party_service_page_load_totals: thirdPartyServicePageLoadTotals
  };
}
