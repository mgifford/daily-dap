# FEATURES.md

> **A comprehensive catalog of all technical features built into Daily DAP, with an international adaptation guide.**

Daily DAP is a daily quality benchmarking system for the most-visited U.S. government websites.
It runs automated accessibility, performance, and usability scans, aggregates traffic-weighted
impact metrics, and publishes dated static HTML reports with trend analysis.

This document is intended to help developers replicate this system for other countries or contexts.

---

## Table of Contents

1. [Project Architecture](#1-project-architecture)
2. [Configuration System](#2-configuration-system)
3. [Data Ingestion](#3-data-ingestion)
4. [Scanners](#4-scanners)
5. [Aggregation & Metrics](#5-aggregation--metrics)
6. [Publishing & Report Generation](#6-publishing--report-generation)
7. [Command-Line Tools](#7-command-line-tools)
8. [Reference Data](#8-reference-data)
9. [GitHub Actions Workflows (CI/CD)](#9-github-actions-workflows-cicd)
10. [Testing Infrastructure](#10-testing-infrastructure)
11. [HTML Report Features](#11-html-report-features)
12. [Accessibility Compliance Features](#12-accessibility-compliance-features)
13. [Output Artifacts & Storage](#13-output-artifacts--storage)
14. [Adapting for Other Countries](#14-adapting-for-other-countries)
15. [Dependencies & Requirements](#15-dependencies--requirements)

---

## 1. Project Architecture

### Directory Structure

```
daily-dap/
├── src/                        # Application source code
│   ├── cli/                    # Command-line entry points & utilities
│   ├── config/                 # Configuration schema and parameter loading
│   ├── ingest/                 # Traffic data ingestion & normalization
│   ├── scanners/               # Lighthouse & ScanGov execution and result parsing
│   ├── aggregation/            # Score, impact, and trend computations
│   ├── publish/                # HTML rendering, report assembly, archiving
│   ├── data/                   # Disability stats, axe rules, FPC mappings, heuristics
│   └── lib/                    # Shared utilities (logging, metadata helpers)
├── tests/
│   ├── unit/                   # Module-level unit tests (15 files)
│   ├── contract/               # JSON schema contract validation
│   ├── integration/            # End-to-end smoke tests
│   └── fixtures/               # Sample DAP data for offline testing
├── docs/reports/               # Generated static site output
│   ├── index.html              # Main dashboard
│   ├── history.json            # Time-series index
│   ├── 404.html                # Custom 404 page
│   ├── daily/YYYY-MM-DD/       # Per-day report directories
│   └── archive/                # Archived (zipped) old reports
├── .github/workflows/          # CI/CD automation and scheduled tasks
└── kitty-specs/                # Project specification and work packages
```

### Pipeline Overview

The system follows a linear ingest → scan → aggregate → publish pipeline:

```
DAP Traffic API
     │
     ▼
src/ingest/dap-source.js          (normalize top pages by traffic)
     │
     ▼
src/scanners/execution-manager.js  (parallel scan orchestration)
     ├── lighthouse-runner.js      (performance, accessibility, SEO, CWV)
     ├── scangov-runner.js         (government-focused accessibility)
     ├── axe-extractor.js          (structured axe-core findings)
     └── tech-detector.js          (CMS and USWDS version detection)
     │
     ▼
src/aggregation/
     ├── score-aggregation.js      (mean Lighthouse scores)
     ├── impact-estimation.js      (traffic-weighted accessibility impact)
     ├── fpc-exclusion.js          (estimated excluded Americans per disability)
     ├── prevalence-impact.js      (disability category impact mapping)
     ├── performance-impact.js     (excess load time and data vs benchmarks)
     ├── slow-risk.js              (Core Web Vitals risk identification)
     └── history-series.js         (time-series trend data)
     │
     ▼
src/publish/
     ├── build-daily-report.js     (assemble unified JSON payload)
     ├── render-pages.js           (generate accessible HTML reports)
     ├── build-history-index.js    (maintain historical index)
     ├── archive-writer.js         (zip and prune old reports)
     ├── failure-report.js         (persist scan failure diagnostics)
     └── artifact-manifest.js      (SHA256 manifest of published files)
     │
     ▼
docs/reports/daily/YYYY-MM-DD/    (committed static output)
```

---

## 2. Configuration System

### `src/config/prevalence.yaml`

Central configuration file controlling scan behavior, impact thresholds, and traffic data sources.

**Scan Settings:**

| Parameter | Default | Description |
|-----------|---------|-------------|
| `url_limit` | 100 | Maximum URLs to scan per run |
| `history_lookback_days` | 31 | Days of history retained in `history.json` |
| `dashboard_display_days` | 14 | Days shown in the live dashboard |
| `traffic_window_mode` | `daily` | Traffic aggregation window (`daily`, `rolling_7d`, `rolling_30d`) |

**DAP API Endpoint:**

```yaml
dap_api:
  base_url: "https://api.gsa.gov/analytics/dap/v2.0.0/reports/site/data"
```

**Impact Metrics -- Section 508 Functional Performance Criteria (FPC) prevalence rates:**

```yaml
prevalence_rates:
  WV:    0.010   # Without Vision      (~3.4M Americans)
  LV:    0.024   # Limited Vision      (~8.1M)
  WPC:   0.043   # Without Perception of Color (~14.5M)
  WH:    0.003   # Without Hearing     (~1.1M)
  LH:    0.035   # Limited Hearing     (~11.9M)
  WS:    0.005   # Without Speech      (~1.7M)
  LM:    0.022   # Limited Manipulation (~7.6M)
  LRS:   0.058   # Limited Reach & Strength (~19.6M)
  LLCLA: 0.047   # Limited Language, Cognitive, Learning (~15.9M)
```

**Severity Weights** (used to compute weighted accessibility impact):

```yaml
severity_weights:
  critical:  1.0
  serious:   0.6
  moderate:  0.3
  minor:     0.1
  fallback:  0.2   # For findings with unknown severity
```

### `src/config/schema.js`

JSON Schema validator for configuration. Validates:
- Integer ranges (URL limits, days)
- Traffic window mode enum
- Prevalence rates (0-1 per category)
- Severity weight values (0-1)
- All required properties are present

### `src/config/prevalence-loader.js`

Loads and exposes configuration. Provides:
- `loadConfig(configPath?)` -- parses and validates YAML
- `getPrevalenceRates()` -- returns the FPC code → rate map
- `getSeverityWeights()` -- returns severity → weight map

---

## 3. Data Ingestion

### `src/ingest/dap-source.js`

Fetches and normalizes top-pages traffic data from the
[Digital Analytics Program (DAP)](https://digital.gov/guides/dap/) API.

**Key Functions:**

| Function | Purpose |
|----------|---------|
| `getNormalizedTopPages(options)` | Main entry point; returns normalized `{url, page_load_count, source_date}[]` |
| `normalizeDapRecords(records)` | Handles flexible field names, deduplicates, filters invalid/placeholder URLs |
| `fetchDapRecords(endpoint, apiKey)` | HTTP fetch from DAP API with optional API key auth |
| `readDapRecordsFromFile(filePath)` | Load records from local JSON file (for testing and dry-runs) |
| `buildDapEndpoint(baseUrl, window)` | Constructs endpoint URL with traffic window parameter |

**Flexible Field Mapping:**

The normalizer accepts data from a variety of analytics APIs by mapping common field names:

- URL field names: `url`, `page`, `page_url`, `hostname`, `domain`
- Count field names: `page_load_count`, `pageviews`, `views`, `hits`, `page_loads`, `visits`

This flexibility makes it easy to swap in a different analytics data provider.

**Filtering:**
- Removes synthetic DAP placeholders (e.g., `(other)`)
- Skips malformed or non-HTTP URLs
- Deduplicates by selecting latest-date records when multiple exist
- Applies configurable `url_limit`

**Auth Support:**
- `--dap-api-key <key>` CLI option
- `DAP_API_KEY` environment variable

---

## 4. Scanners

### `src/scanners/execution-manager.js`

Orchestrates parallel URL scanning across all registered scanners.

**Features:**
- Configurable **concurrency** (default: 2 parallel scans)
- Per-URL **timeout** (default: 90 seconds)
- **Retry logic** with configurable attempts and delay (default: 2 retries, 2 s delay)
- Inter-scan **rate-limiting** delay (default: 1 second between scans)
- URL **exclusion predicates** for pre-scan filtering
- Runs **Lighthouse + ScanGov in parallel** for each URL
- Collects structured diagnostics (attempt counts, timeouts, retry counts)

### `src/scanners/lighthouse-runner.js`

Wraps [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview/) to scan a URL
and extract structured results.

**Outputs per URL:**

| Field | Description |
|-------|-------------|
| `performance_score` | Lighthouse performance score (0-100) |
| `accessibility_score` | Lighthouse accessibility score |
| `best_practices_score` | Best practices score |
| `seo_score` | SEO score |
| `pwa_score` | Progressive Web App score |
| `core_web_vitals_status` | `good`, `needs_improvement`, `poor`, or `unknown` |
| `lcp_value_ms` | Largest Contentful Paint in milliseconds |
| `total_byte_weight` | Total page weight in bytes |
| `axe_findings` | Structured axe-core accessibility findings |
| `detected_technologies` | CMS platform(s) and USWDS version |

### `src/scanners/scangov-runner.js`

Wraps [ScanGov](https://github.com/GSA/scan-gov) for additional government-specific
accessibility scanning. Outputs findings normalized to `{critical, serious, moderate, minor}`.

### `src/scanners/axe-extractor.js`

Extracts structured axe-core findings from Lighthouse's raw result object.

**Extraction Detail per Finding:**
- Rule ID and title
- Description and impact severity
- DOM node details: CSS selector, HTML snippet, label, and explanation
- WCAG 2.x Success Criteria references

### `src/scanners/tech-detector.js`

Detects CMS platform and USWDS version from Lighthouse network request audit data.

**CMS Detection Patterns:**

| CMS | Signal Patterns |
|-----|----------------|
| WordPress | `/wp-content/`, `/wp-includes/`, `wp-json`, `/wp-admin/` |
| Drupal | `/sites/`, `/core/misc/`, `/modules/`, `drupal.js` |
| Joomla | `/components/com_`, `/media/`, `joomla` in paths |

**USWDS Detection:**
- Identifies assets with `uswds` in the URL
- Extracts semantic version from path patterns (e.g., `@3.8.0`, `uswds-3.8.0`)
- Reports the latest detected version via semver comparison

### `src/scanners/result-normalizer.js`

Normalizes outputs from all scanners into a unified per-URL schema.

**Normalized Schema Fields:**

```
url, page_load_count, scan_status (success|failed|excluded),
failure_reason, performance_score, accessibility_score,
best_practices_score, seo_score, pwa_score,
core_web_vitals_status, lcp_value_ms, total_byte_weight,
axe_findings[], scangov_findings[], detected_technologies,
run_id, attempt_count, retry_count, timeout_count
```

### `src/scanners/diagnostics.js`

Builds per-run diagnostic summaries including error breakdown and scan statistics.

### `src/scanners/status-classifier.js`

Classifies failure reasons into a catalog of known types (timeout, malformed output,
execution error, etc.) to support structured failure reporting.

### `src/scanners/accessibility-statement-checker.js`

Detects whether federal websites publish digital accessibility statements as required
by OMB Memorandum M-24-08. Probes standard URL paths (e.g., `/accessibility`,
`/section-508`) using HEAD requests.

**Summary Fields:**
- `domains_checked` - Total unique domains probed
- `domains_with_statement` - Domains with a detectable statement
- `statement_rate_percent` - Compliance rate
- `domains_without_statement[]` - Sorted list of non-compliant domains
- `statement_urls[]` - Sorted list of found statement URLs

### `src/scanners/required-links-checker.js`

Detects whether federal websites provide the federally-required page links mandated
by OMB Memorandum M-17-06 "Policies for Federal Agency Public Websites and Digital
Services" and reinforced by the 21st Century Integrated Digital Experience Act (IDEA).

Checks three link types per domain using HEAD requests against standard URL paths:

| Link Type | Paths Checked | Policy Basis |
|-----------|--------------|--------------|
| Privacy Policy | `/privacy`, `/privacy-policy`, `/privacy.html`, ... | OMB M-03-22 / M-17-06 |
| Contact Page | `/contact`, `/contact-us`, `/contact.html`, ... | OMB M-17-06 |
| FOIA Page | `/foia`, `/freedom-of-information`, `/foia.html`, ... | 5 U.S.C. 552 |

These compliance checks extend what was tracked by the performance.gov website
performance initiative (`/cx/websiteperformance/`), which was a federal CX effort
that benchmarked required-links adoption across high-traffic federal websites.
That initiative is no longer actively maintained but its compliance criteria remain
required by the underlying statutes and OMB policy cited above.

**Summary Fields (`required_links_summary`):**
- `domains_checked` - Total unique domains checked
- `fully_compliant_domains` - Domains with all three link types present
- `fully_compliant_rate_percent` - Overall compliance rate
- `by_type.{privacy|contact|foia}` - Per-link-type breakdown with rate, missing domains, and found URLs

---

### `src/scanners/environmental-scanner.js`

Fetches air quality and pollen data for 41 major U.S. metro areas to produce a lightweight
national signal for environmental conditions that may create situational disabilities.

**Purpose:**
High air pollution, particle matter (PM2.5), and elevated pollen can cause irritated eyes,
blurred vision, headaches, fatigue, and reduced concentration. On affected days, people may
rely more heavily on zoom, contrast, clear headings, plain language, keyboard navigation,
and error-tolerant forms. This feature provides a daily contextual signal alongside the
accessibility scan results.

**Data Sources:**

| Source | Condition | API Key Required |
|--------|-----------|-----------------|
| AirNow API | AQI >= 101 (unhealthy for sensitive groups) | `AIRNOW_API_KEY` |
| AirNow API | PM2.5 AQI >= 101 (particle pollution proxy) | `AIRNOW_API_KEY` |
| Google Pollen API | TREE / GRASS / WEED pollen HIGH or VERY_HIGH | `GOOGLE_MAPS_API_KEY` |
| Seasonal estimate | Month-based tree/grass/weed windows | None (fallback) |

Seasonal pollen windows:
- Tree: March-June
- Grass: May-July
- Weed: August-October

**Scoring Model:**

Three metro-level counts are computed:
- `pollutionMetroCount` - metros with any AQI >= 101
- `particleMetroCount` - metros with PM2.5 AQI >= 101
- `pollenMetroCount` - metros with HIGH or VERY_HIGH pollen

Overall level = `computeOverallLevel(pollutionMetroCount + particleMetroCount + pollenMetroCount)`:
- **low**: 0-2 total signals
- **moderate**: 3-5 total signals
- **high**: 6+ total signals

**Exports:**
- `METRO_LIST` - 41 U.S. metro areas with ZIP, lat, lon
- `isAqiAffected(aqi)` - returns true if AQI >= 101
- `isPollenAffected(category)` - returns true for HIGH or VERY_HIGH
- `getSeasonalPollenTypes(month)` - returns in-season pollen types for a 1-indexed month
- `computeOverallLevel(totalSignals)` - returns 'low' | 'moderate' | 'high'
- `parseAirNowObservations(observations)` - extracts max AQI and PM2.5 AQI from AirNow response
- `parsePollenResponse(response)` - extracts pollen type info from Google Pollen API response
- `fetchAirNowForMetro(metro, apiKey, fetchImpl)` - queries AirNow for a single metro
- `fetchPollenForMetro(metro, apiKey, fetchImpl)` - queries Google Pollen for a single metro
- `fetchEnvironmentalConditions(options)` - main entry point; returns full `environmentalConditions` payload

**Resilience:**
The feature is fully optional. Build does not fail if API keys are absent. Degrades gracefully:
1. Full data (AirNow + Google Pollen) when both API keys present
2. Pollution-only (no pollen) when only `AIRNOW_API_KEY` set
3. Seasonal pollen + no air quality when only `GOOGLE_MAPS_API_KEY` absent
4. Seasonal pollen only (no air quality) when no API keys configured
5. `null` environmental_conditions if the function throws unexpectedly

**Limitations:**
- Not a scientific exposure model; does not claim medical accuracy
- PM2.5 is labeled as "particle pollution" not "wildfire smoke" (specific cause not identified)
- Population exposure percentages are not claimed
- Google Pollen data is forecast-based; may not reflect real-time conditions

---

## 5. Aggregation & Metrics

### `src/aggregation/score-aggregation.js`

Computes mean Lighthouse scores across all successfully-scanned URLs.

- Produces per-category means: Performance, Accessibility, Best Practices, SEO, PWA
- Reports URL counts: total, included, excluded
- Values rounded to 2 decimal places

### `src/aggregation/impact-estimation.js`

Estimates cumulative accessibility impact using traffic-weighted severity scores.

**Algorithm:**
1. For each severity level (critical → minor), retrieve findings at that level
2. Multiply the finding count by the configured severity weight
3. Multiply by affected page loads to get a weighted impact contribution
4. Sum across all URLs and severity levels

**Output:** `url_impacts[]` (0.0-1.0 per URL) and `totals.affected_traffic`.

### `src/aggregation/fpc-exclusion.js`

Computes estimated excluded Americans per Section 508 Functional Performance Criteria category.

**Algorithm:**
1. For each axe finding, look up its FPC codes via `axe-fpc-mapping.js`
2. Accumulate `page_load_count` for URLs with findings in each FPC category
3. Multiply accumulated traffic by that category's Census prevalence rate

**Output:** Per-FPC: `affected_page_loads`, `estimated_excluded_users`.

### `src/aggregation/prevalence-impact.js`

Maps FPC exclusion totals to estimated impacted share percentages.

**Output per Category:**
- `prevalence_rate` -- from Census data
- `estimated_impacted_users` -- calculated from traffic x rate
- `estimated_impacted_share_percent` -- proportion of total scanned traffic

### `src/aggregation/performance-impact.js`

Quantifies cumulative performance overhead compared to Google web.dev benchmarks.

**Benchmarks Used:**
- Good LCP threshold: **2.5 seconds**
- Recommended page weight: **1.6 MB**

**Calculations:**
- Extra load time (hours) = sum((lcp_ms - 2500) x page_loads) / 3,600,000
- Extra data (GB) = sum(max(0, byte_weight - 1,677,722) x page_loads) / 1,073,741,824

**Output:** Total extra load hours, extra data GB, URL counts for each dimension.

### `src/aggregation/slow-risk.js`

Identifies URLs with poor Core Web Vitals and computes traffic-weighted slow-risk share.

**Output:** Slow-risk URL count, traffic volume, and share percentage.

### `src/aggregation/history-series.js`

Maintains and queries time-series history of daily quality metrics.

- Loads `history.json` entries from previous runs
- Appends new run summary data
- Enforces configurable lookback window (default: 31 days)

---

## 6. Publishing & Report Generation

### `src/publish/build-daily-report.js`

Assembles the unified daily report JSON payload from all aggregation outputs.
Also calls `dotgov-lookup.js` to enrich each URL's `top_urls` entry with the
owning government organization name and domain type.

**Report Payload Top-Level Keys:**

```
run_id, run_date, traffic_window, url_limit,
scan_summary (succeeded, failed, excluded),
score_aggregates (mean Lighthouse scores + url_counts),
weighted_impact,
prevalence_impact (per-FPC exclusion estimates),
fpc_exclusion (per-FPC affected traffic and exclusion metrics),
performance_impact (extra load time, extra data),
top_urls[] (full per-URL detail including axe_findings[]),
tech_summary (CMS & USWDS prevalence),
history_series[] (trend data)
```

### `src/publish/render-pages.js`

Generates all accessible HTML output files from the report payload (~7,000 lines).

**Exported Page Generators:**

| Function | Output File | Description |
|----------|-------------|-------------|
| `renderDailyReportPage()` | `daily/YYYY-MM-DD/index.html` | Full detailed daily report |
| `renderDashboardPage()` | `docs/reports/index.html` | Multi-day trend dashboard |
| `renderArchiveIndexPage()` | `docs/reports/archive/index.html` | Listing of archived reports |
| `renderArchiveRedirectStub()` | Archived report directory | Redirect for archived dates |
| `render404Page()` | `docs/reports/404.html` | Custom 404 error page |

**HTML Design Principles:**
- All pages use semantic HTML5 landmarks (`<header>`, `<main>`, `<nav>`, `<footer>`)
- Accessible tables with `<thead>`, `<tbody>`, and scoped `<th>` headers
- Dark/light mode toggle persisted in `localStorage` with system preference detection
- Skip-to-main-content links for keyboard navigation
- ARIA labels, roles, and descriptions for all interactive and graphical elements
- HTML-escaped user-controlled content (via `escapeHtml()`)
- UTF-8 encoding throughout; no smart quotes or Windows-1252 characters

### `src/publish/build-history-index.js`

Maintains `history.json`, the time-series index used for dashboard trend charts.

- Deduplicates runs by date
- Enforces configurable lookback (default: 31 days)
- Sorts entries chronologically (newest first)

### `src/publish/archive-writer.js`

Archives daily report directories older than the dashboard display window.

**Archive Process:**
1. Identify directories older than `--display-days` (default: 14)
2. Zip the directory to `docs/reports/archive/YYYY-MM-DD.zip`
3. Remove large files from live directory (`index.html`, `axe-findings.json`, `axe-findings.csv`)
4. Write an archive redirect stub `index.html`
5. Regenerate `docs/reports/archive/index.html`

Also writes `axe-findings.json` and `axe-findings.csv` to each daily directory at scan time.

### `src/publish/failure-report.js`

Writes `failure-report.json` to each daily directory with structured scan failure diagnostics.

### `src/publish/artifact-manifest.js`

Generates a SHA256-based integrity manifest of key published files.

**Tracked Files:**
- `docs/reports/daily/{date}/report.json`
- `docs/reports/history.json`

**Output:** `artifact-manifest.json` with paths, SHA256 hashes, and byte counts.

---

## 7. Command-Line Tools

### `src/cli/run-daily-scan.js` -- Main Orchestrator

Coordinates the full ingest → scan → aggregate → publish pipeline.

**CLI Options:**

| Category | Option | Default | Description |
|----------|--------|---------|-------------|
| Rate limiting | `--concurrency <n>` | 2 | Parallel scan threads |
| Rate limiting | `--timeout-ms <n>` | 90000 | Per-URL timeout (ms) |
| Rate limiting | `--max-retries <n>` | 2 | Retry attempts per URL |
| Rate limiting | `--retry-delay-ms <n>` | 2000 | Delay between retries (ms) |
| Rate limiting | `--inter-scan-delay-ms <n>` | 1000 | Delay between scans (ms) |
| Data sources | `--source-file <path>` | -- | Load URLs from local JSON |
| Data sources | `--dap-api-key <key>` | `$DAP_API_KEY` | DAP API auth key |
| Data sources | `--limit <n>` | config | Override `url_limit` |
| Data sources | `--traffic-window <mode>` | config | `daily`, `rolling_7d`, `rolling_30d` |
| Execution | `--scan-mode <mode>` | `live` | `live` or `mock` |
| Execution | `--dry-run` | false | Preview config, skip scans |
| Execution | `--date <YYYY-MM-DD>` | today | Override run date |
| Execution | `--config <path>` | auto | Override config file path |
| Output | `--output-root <dir>` | repo root | Override output directory |

**Example Commands:**

```bash
# Standard production run
node src/cli/run-daily-scan.js

# Test with a small sample file
node src/cli/run-daily-scan.js --source-file tests/fixtures/dap-sample.json --limit 5

# Dry run (preview configuration only)
node src/cli/run-daily-scan.js --dry-run --limit 10

# Custom rate limiting for slow networks
node src/cli/run-daily-scan.js --concurrency 1 --timeout-ms 120000 --inter-scan-delay-ms 2000

# Mock mode for CI testing
node src/cli/run-daily-scan.js --scan-mode mock --date 2026-03-25
```

### `src/cli/generate-accessibility-summary.js`

Generates a Markdown GitHub Actions step summary from the latest report.

- **Inputs:** `report.json` and `axe-findings.json`
- **Output:** Markdown written to `$GITHUB_STEP_SUMMARY`
- **Content:** Top accessibility barriers, severity distribution, score trends,
  estimated exclusion counts, call-to-action links

### `src/cli/generate-press-release.js`

Generates a plain-language press release (news release) from the daily report.

- **Input:** `report.json` and `axe-findings.json`
- **Output:** `press-release.md` in `docs/reports/daily/YYYY-MM-DD/`
- **Content:** Top accessibility barriers, affected URL counts, policy narratives
  per finding, links to detailed report

### `src/cli/archive-old-reports.js`

Standalone CLI wrapper around `archive-writer.js` for archiving old reports.

**Options:**
- `--repo-root <dir>` -- repo root (auto-detected by default)
- `--display-days <n>` -- display window (default: 14)

### `src/cli/update-axe-rules.js`

Checks the currency of axe-core rule data in `axe-impact-rules.yaml`.

**Options:**
- `--check` -- verify YAML version matches installed axe-core and review date is not past
- `--list-new` -- show axe-core rules not yet present in the YAML

Used by the bi-annual `check-axe-rules.yml` GitHub Actions workflow.

---

## 8. Reference Data

### `src/data/census-disability-stats.js`

U.S. Census Bureau disability prevalence data for the 9 Section 508 FPC categories.

**Data Source:** [ACS 2023 1-Year Estimates, Table B18101](https://data.census.gov/table/ACSDT1Y2023.B18101)

**Review Schedule:** Annually (next review: 2027-01-01)

**Supplemental Sources:**
- [CDC Disability and Health Data System (DHDS)](https://www.cdc.gov/ncbddd/disabilityandhealth/features/disability-prevalence-rural-urban.html)
- [NIDCD Hearing Statistics](https://www.nidcd.nih.gov/health/statistics/quick-statistics-hearing)
- [American Foundation for the Blind (AFB)](https://www.afb.org/research-and-initiatives/statistics)
- [NIH National Eye Institute (NEI) -- Color Blindness](https://www.nei.nih.gov/learn-about-eye-health/eye-conditions-and-diseases/color-blindness)

**Exported Functions:**
- `getFpcPrevalenceRates()` -- returns the FPC code → rate map
- `isCensusDataStale(checkDate?)` -- returns `true` if review date has passed

### `src/data/axe-impact-rules.yaml`

Comprehensive mapping of axe-core 4.11 accessibility rules to impact data.

**File Contents:**
- `metadata` -- axe_version, last_updated, next_review_date, source URL
- `functional_performance_specification` -- US Section 508 FPC and EU EN 301 549 v3.2.1 categories
- `rules[]` -- One entry per axe rule containing:
  - `rule_id` and `title`
  - `technical_summary` -- concise description of what the issue is
  - `policy_narrative` -- `title`, `why_it_matters`, `affected_demographics[]`
  - `fpc_codes[]` -- associated Section 508 FPC categories
  - `wcag_sc[]` -- WCAG 2.x Success Criteria, with `wcag_sc_draft` and `wcag_version_note`
  - `en301549_clauses[]` -- EU standard clauses, with `en301549_draft` flag

**Review Schedule:** Bi-annual (March 20 and September 20 each year)

### `src/data/axe-impact-loader.js`

Loads `axe-impact-rules.yaml` once at module initialization and provides
lookup functions (cached in memory).

**Exported Functions:**

| Function | Returns |
|----------|---------|
| `getAxeImpactRules()` | Full parsed YAML document |
| `getAxeImpactRuleMap()` | `Map<ruleId, entry>` |
| `getPolicyNarrative(ruleId)` | `{title, why_it_matters, affected_demographics}` |
| `getTechnicalSummary(ruleId)` | String description |
| `getRuleFpcCodes(ruleId)` | `string[]` of FPC codes |
| `getRuleWcagSc(ruleId)` | `{sc[], draft, version_note}` |
| `getRuleEn301549Clauses(ruleId)` | `{clauses[], draft}` |
| `getHeuristicsForAxeRule(ruleId)` | Associated NN/g heuristic IDs |
| `isAxeImpactDataStale(checkDate?)` | `true` if review date has passed |

### `src/data/axe-fpc-mapping.js`

Maps axe-core rule IDs to Section 508 FPC disability category codes and provides
display assets for each category.

**Key Exports:**

| Export | Type | Description |
|--------|------|-------------|
| `AXE_TO_FPC` | `Map<ruleId, string[]>` | Maps each axe rule to its FPC codes |
| `FPC_LABELS` | `Record<string, string>` | Human-readable label per FPC code |
| `FPC_DESCRIPTIONS` | `Record<string, string>` | Tooltip text per FPC code |
| `FPC_SVGS` | `Record<string, string>` | Inline SVG icon per FPC code |

**SVG Icon Features:**
- `role="img"`, `aria-label`, inner `<title>`, inner `<desc>` for full screen reader support
- `makeDecorativeSvg()` -- strips ARIA attributes and adds `aria-hidden="true"` for badge use
- 9 disability category icons in 24x24 viewBox, stroke-based for scalability
- High contrast compatible for low-vision users

### `src/data/nng-heuristics.js`

Nielsen Norman Group's 10 Usability Heuristics, each mapped to associated WCAG 2.x
Success Criteria.

**Exported Data:** `NNG_HEURISTICS` array

**Each Heuristic Includes:**
- `id` (1-10), `name`, `description`, `url` (link to NN/g article)
- `wcag_sc[]` -- WCAG Success Criteria aligned with this heuristic

**Lookup Function:** `getHeuristicIdsForWcagSc(sc)` -- returns heuristic IDs for a given SC.

**Data Source:** Adapted from [CivicActions accessibility-data-reference](https://github.com/CivicActions/accessibility-data-reference).

### `src/data/dotgov-lookup.js`

Fetches the CISA `.gov` registry CSV to map domain names to owning government organizations.

**Data Source:** `https://github.com/cisagov/dotgov-data` -- `current-federal.csv` (updated daily)

**CSV Columns Used:** Domain name, Domain type, Organization name, Suborganization name

**Exported Functions:**

| Function | Description |
|----------|-------------|
| `loadDotgovData()` | Fetches and caches the CSV as a `Map<hostname, {organization_name, domain_type}>` |
| `lookupDomain(hostname, map)` | Returns `{organization_name, domain_type}` or `null` |
| `hostnameFromUrl(url)` | Extracts normalized hostname from a full URL |
| `parseDotgovCsv(csvText)` | Parses raw CSV text into the lookup map |

In-memory cache: fetched once per process, reused for all URL enrichment calls.

---

## 9. GitHub Actions Workflows (CI/CD)

### `.github/workflows/daily-scan.yml` -- Main Pipeline

**Triggers:**
- **Scheduled:** 09:17 UTC daily (`cron: '17 9 * * *'`)
- **Manual dispatch** with inputs: `run_date`, `url_limit`, `traffic_window`, `dry_run`, `scan_mode`

**Pipeline Steps:**
1. Checkout with full git history (`fetch-depth: 0`)
2. Setup Node.js 24 with npm cache
3. Install Google Chrome for Lighthouse
4. Install npm dependencies
5. Run tests (`npm test`)
6. Execute scan pipeline (`run-daily-scan.js`) with configured arguments
7. Upload run artifacts to GitHub Actions artifact store
8. Archive old reports (if not dry-run and scan succeeded)
9. Commit and push generated reports to `main` (with rebase conflict resolution)
10. Generate GitHub Actions step summary (accessibility barrier counts)
11. Generate daily press release Markdown

**Concurrency:** Single-run group; concurrent runs are cancelled.

### `.github/workflows/check-axe-rules.yml` -- Bi-Annual Axe Data Review

**Triggers:**
- **Scheduled:** March 20 and September 20 at 09:00 UTC
- **Manual dispatch** with optional `check_date` override

**Steps:**
1. Check axe-impact-rules.yaml freshness vs installed axe-core version and next review date
2. List any axe-core rules not yet in the YAML
3. Auto-create GitHub issue if data is stale or rules are missing
   - Issue label: `axe-rules-review`
   - Body includes: action items, new rule IDs, link to Deque rule documentation

### `.github/workflows/check-census-data.yml` -- Annual Census Data Review

**Triggers:**
- **Scheduled:** January 2 at 09:00 UTC
- **Manual dispatch** with optional `check_date` override

**Steps:**
1. Check `census-disability-stats.js` vintage year and review date
2. Auto-create GitHub issue if stale
   - Issue label: `census-data-review`
   - Body includes: links to ACS table, supplemental sources, step-by-step update guide

### `.github/workflows/scan-github-pages.yml` -- Accessibility Self-Scan

Runs automated axe-core accessibility scanning against the published GitHub Pages site.

**Triggers:**
- **Scheduled:** 1st of every month
- **Push** to `main` that modifies anything under `docs/`

**Scanned Pages:**
- `https://mgifford.github.io/daily-dap/` (main dashboard)
- `https://mgifford.github.io/daily-dap/docs/reports/` (reports index)

**Requirements:** `GH_TOKEN` secret with `contents:write`, `issues:write`, `pull-requests:write` permissions.

### `.github/workflows/merge-all-branches.yml` -- Utility

Manual-only workflow to merge all branches into `main` with conflict detection.

---

## 10. Testing Infrastructure

### Test Organization

| Directory | Files | Purpose |
|-----------|-------|---------|
| `tests/unit/` | 15+ test files | Module-level unit tests |
| `tests/contract/` | 1 file | JSON schema contract validation |
| `tests/integration/` | 1 file | End-to-end pipeline smoke test |
| `tests/fixtures/` | `dap-sample.json` | Sample DAP data for offline testing |

### Unit Tests

| Test File | Module Tested |
|-----------|---------------|
| `config-validation.test.js` | `src/config/schema.js` |
| `dap-ingest.test.js` | `src/ingest/dap-source.js` |
| `score-aggregation.test.js` | `src/aggregation/score-aggregation.js` |
| `impact-estimation.test.js` | `src/aggregation/impact-estimation.js` |
| `prevalence-impact.test.js` | `src/aggregation/prevalence-impact.js` |
| `fpc-exclusion.test.js` | `src/aggregation/fpc-exclusion.js` |
| `performance-impact.test.js` | `src/aggregation/performance-impact.js` |
| `slow-risk.test.js` | `src/aggregation/slow-risk.js` |
| `history-series.test.js` | `src/aggregation/history-series.js` |
| `axe-extractor.test.js` | `src/scanners/axe-extractor.js` |
| `axe-impact-loader.test.js` | `src/data/axe-impact-loader.js` |
| `tech-detector.test.js` | `src/scanners/tech-detector.js` |
| `dotgov-lookup.test.js` | `src/data/dotgov-lookup.js` |
| `accessibility-summary.test.js` | `src/cli/generate-accessibility-summary.js` |
| `press-release.test.js` | `src/cli/generate-press-release.js` |
| `render-pages.test.js` | `src/publish/render-pages.js` |
| `scanner-execution.test.js` | `src/scanners/execution-manager.js` |

### Contract Tests

`tests/contract/report-schema.test.js` validates the structure of `report.json` against
a JSON Schema. Guards against regressions in the report payload shape.

### Integration Tests

`tests/integration/daily-scan-smoke.test.js` runs the full pipeline end-to-end
against `tests/fixtures/dap-sample.json` using mock scan mode.

### Test Framework

Node.js built-in test runner (`node --test`) with ES module support.
No external test framework dependency.

### Running Tests

```bash
npm test                  # All unit + contract + integration tests
npm run ci                # Tests + dry-run pipeline preview
npm run dry-run           # Dry-run pipeline only (no scans)
```

---

## 11. HTML Report Features

### Daily Report Page (`renderDailyReportPage`)

The daily report is a self-contained HTML page with the following sections:

**1. Report Header**
- Scan date and run statistics (total URLs, success/fail/exclude counts)
- Score cards for the 5 Lighthouse categories with trend indicators (↑↓→)

**2. Accessibility Impact Section**
- Traffic-weighted impact score (0.0-1.0 scale)
- Total affected page loads
- Estimated proportion of traffic impacted

**3. FPC Exclusion Section**
- Table of all 9 disability categories
- Per-category: SVG icon, label, prevalence rate, estimated excluded Americans
- Tooltip on each disability badge with detailed description
- Disability badge SVGs use `role="img"`, `aria-label`, `<title>`, `<desc>` for accessibility

**4. Performance Impact Section**
- Extra cumulative load time above Google's 2.5 s LCP benchmark (shown in hours)
- Extra data transferred above Google's 1.6 MB page weight benchmark (shown in GB)

**5. Top URLs Table**
- URL with `.gov` organization name displayed below the link (from CISA dotgov registry)
- Page load count for each URL
- Scan status with failure reason if applicable
- Lighthouse scores for all 5 categories
- Core Web Vitals status badge
- LCP milliseconds
- Detected technology stack (CMS name, USWDS version)
- Count of total and severe accessibility findings

**6. Detailed Findings Section**
- Per-URL expandable finding blocks
- For each axe finding: rule ID, title, severity badge, affected FPC disability icons
- Policy narrative: why it matters, affected demographics
- NN/g usability heuristics alignment (with links)
- HTML node selector and code snippet
- WCAG 2.x Success Criteria references with links to official criteria

**7. Technology Summary Section**
- CMS adoption breakdown (WordPress, Drupal, Joomla, none detected)
- USWDS adoption percentage and version distribution

**8. History Trend Chart**
- Line chart of mean Lighthouse scores over the lookback window
- Separate line per category (Performance, Accessibility, etc.)
- Date labels on x-axis, score on y-axis

**9. Call-to-Action Section**
- Links to Section 508 compliance resources
- Open Scans tool promotion
- Recommended accessibility testing tools
- USWDS adoption messaging
- Federal disability hiring information

### Dashboard Page (`renderDashboardPage`)

- Latest scan date and summary statistics
- Multi-day trend lines for all Lighthouse categories
- Report listing with links to individual daily reports
- Navigation to archive index

### Accessibility Self-Compliance Features

Every generated HTML page includes:
- `<!DOCTYPE html>`, `lang="en"`, `charset="UTF-8"`, viewport `<meta>`
- Proper heading hierarchy (single `<h1>`, logical nesting)
- Skip-to-main-content link at top of page
- Light/dark mode toggle with `localStorage` persistence and system preference detection
- Anti-FOCT (Flash of Current Theme) script in `<head>` before first paint
- All user-controlled data HTML-escaped via `escapeHtml()`

---

## 12. Accessibility Compliance Features

### Target Conformance Level

**WCAG 2.2 Level AA** for all generated HTML output.

### Scanning Standards Covered

| Standard | Coverage |
|----------|---------|
| WCAG 2.2 | Automated checks via Lighthouse + axe-core |
| Section 508 (US) | FPC category mapping for all axe findings |
| EN 301 549 (EU) | EU clause mapping for all axe findings in YAML |

### Report Accessibility Implementation

| Feature | Implementation |
|---------|----------------|
| Semantic HTML5 | Landmarks, headings, lists, tables |
| Table headers | `<th scope="col">` / `<th scope="row">` for all data tables |
| Images and icons | `role="img"` + `aria-label` + `<title>` + `<desc>` on all SVGs |
| Decorative icons | `aria-hidden="true"` when icon is alongside labeled text |
| Color independence | Information is never conveyed by color alone (icons + text) |
| Contrast | Color palette designed for WCAG 1.4.3 (AA) contrast ratio |
| Keyboard navigation | Skip links, logical tab order, visible focus indicators |
| Interactive tooltips | ARIA `role="tooltip"` + `aria-describedby`; Escape key to dismiss |
| Dark mode | CSS custom properties, `prefers-color-scheme`, `localStorage` toggle |
| Language | `lang="en"` on `<html>` element |
| Encoding | UTF-8 throughout; no curly quotes or Windows-1252 characters |

### Data Staleness Monitoring

Two scheduled workflows automatically open GitHub issues when reference data ages out:
- **`check-axe-rules.yml`** -- bi-annual axe rule data freshness check
- **`check-census-data.yml`** -- annual Census disability prevalence review

---

## 13. Output Artifacts & Storage

### Generated File Tree

```
docs/reports/
├── index.html                      # Main dashboard (regenerated daily)
├── history.json                    # Time-series index (31-day lookback)
├── 404.html                        # Custom 404 page
├── daily/
│   └── YYYY-MM-DD/
│       ├── index.html              # Full daily report (rendered HTML)
│       ├── report.json             # Complete aggregated data payload
│       ├── axe-findings.json       # All axe findings per URL
│       ├── axe-findings.csv        # CSV export of axe findings
│       ├── failure-report.json     # Scan failures and error details
│       ├── artifact-manifest.json  # SHA256 hashes of key files
│       └── press-release.md        # Auto-generated news release
└── archive/
    ├── index.html                  # Archive listing (links to zips)
    └── YYYY-MM-DD.zip              # Archived report (report.json retained)
```

### Archival Policy

Reports older than the dashboard display window (default: 14 days) are archived:
1. The full directory is zipped to `archive/YYYY-MM-DD.zip`
2. Large files are removed from the live directory (`index.html`, `axe-findings.json`, `axe-findings.csv`)
3. A redirect stub `index.html` replaces the full report page
4. `report.json` is retained for history-series lookback queries

---

## 14. Adapting for Other Countries

This section is a guide for teams wanting to replicate Daily DAP for a different country
or jurisdiction. Each subsection identifies what to change and where.

### Traffic Data Source

Daily DAP uses the U.S. Digital Analytics Program (DAP) API as its traffic data source.
To replace it:

1. **Implement an adapter** in `src/ingest/` (e.g., `src/ingest/my-country-source.js`)
   following the same interface as `dap-source.js`:
   - Export `getNormalizedTopPages(options)` returning `{url, page_load_count, source_date}[]`
   - Accept `--source-file` for offline testing

2. **Update `prevalence.yaml`** to point to your analytics API endpoint.

3. The flexible field mapping in `normalizeDapRecords()` already supports common field names
   (`pageviews`, `views`, `visits`, etc.), which may work with your data source without changes.

**Examples of compatible traffic data sources:**
- Any government analytics API that exposes top pages with page view counts
- Static JSON export from Google Analytics, Matomo, or similar
- A curated list of URLs with estimated traffic (e.g., from web crawl data)

### Disability Prevalence Data

The FPC exclusion and prevalence impact modules use U.S. Census data.

1. **Create** `src/data/local-disability-stats.js` modeled on `census-disability-stats.js`.
   - Populate rates for the 9 FPC categories (or your local equivalents) from national surveys.
   - Include source URLs and a review date.
   - Export `getFpcPrevalenceRates()` and `isCensusDataStale()`.

2. **Update** `src/aggregation/fpc-exclusion.js` and `src/aggregation/prevalence-impact.js`
   to import from your new data file.

3. **Update** `src/config/prevalence.yaml` `prevalence_rates` section with your data.

**Candidate data sources by region:**

| Region | Source |
|--------|--------|
| European Union | [Eurostat Disability Statistics](https://ec.europa.eu/eurostat/statistics-explained/index.php/Disability_statistics) |
| United Kingdom | [ONS Disability Survey](https://www.ons.gov.uk/peoplepopulationandcommunity/healthandsocialcare/disability) |
| Canada | [Canadian Survey on Disability (Statistics Canada)](https://www.statcan.gc.ca/en/survey/household/3251) |
| Australia | [ABS Survey of Disability, Ageing and Carers](https://www.abs.gov.au/statistics/health/disability) |

### Domain Registry Enrichment

Daily DAP fetches the CISA `.gov` domain registry to display owning organization names.

1. **Update** `src/data/dotgov-lookup.js` to fetch your country's government domain registry.
   - Replace the CISA CSV URL with your registry's endpoint.
   - Adjust `parseDotgovCsv()` to match your registry's column layout.
   - The `loadDotgovData()` / `lookupDomain()` API can remain the same.

2. If no domain registry exists, the system degrades gracefully: org names simply won't be shown.

**Candidate registries:**

| Country | Registry |
|---------|---------|
| United States | [CISA dotgov-data](https://github.com/cisagov/dotgov-data) |
| United Kingdom | [GOV.UK crown domain list](https://www.gov.uk/government/publications/list-of-gov-uk-domain-names) |
| Australia | [auDA domain list](https://www.auda.org.au/au-domain-names/gov-au) |
| Canada | `gc.ca` / `canada.ca` subdomains (no public CSV; parse from WHOIS or DNS) |

### Accessibility Standards Mapping

Daily DAP maps findings to U.S. Section 508 Functional Performance Criteria (FPC).
For non-U.S. use:

1. **Update** `src/data/axe-impact-rules.yaml` -- the `fpc_codes[]` field on each rule
   can be repurposed to hold the local standard's identifiers.

2. **Update** `src/data/axe-fpc-mapping.js` -- replace FPC labels, descriptions, and SVG icons
   to reflect your local standards framework (e.g., EN 301 549 for the EU).

3. **Update** `src/config/prevalence.yaml` `prevalence_rates` to use your local standard's
   category codes and corresponding prevalence estimates.

4. EN 301 549 clause data is already included in `axe-impact-rules.yaml` under `en301549_clauses`
   for each rule; adapt `fpc-exclusion.js` to aggregate by EU clause instead of FPC code.

### Scan Targets

By default, Daily DAP scans the top 100 URLs from the DAP traffic report.
To use a different selection strategy:

1. Change `url_limit` in `prevalence.yaml`.
2. Provide a curated URL list via `--source-file` pointing to a local JSON file with the same
   schema as `tests/fixtures/dap-sample.json`.
3. Implement a custom ingest module (see **Traffic Data Source** above).

### Automated Scheduling

The `daily-scan.yml` workflow commits results back to the repository and publishes via
GitHub Pages. Key changes for a fork:

1. **Set the schedule** in `.github/workflows/daily-scan.yml` (`cron` expression).
2. **Configure secrets**: `DAP_API_KEY` (or your analytics API key equivalent).
3. **Enable GitHub Pages** for the `docs/` folder on the `main` branch.
4. **Update `scan-github-pages.yml`** with your GitHub Pages URL.

---

## 15. Dependencies & Requirements

### Runtime Requirements

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | >=22.19 | ES modules, native test runner |
| Google Chrome | Latest | Required by Lighthouse for scanning |

### npm Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `lighthouse` | ^13.0.3 | Web performance, accessibility, SEO, and best practices auditing |
| `chrome-launcher` | ^1.2.0 | Launches Chrome for Lighthouse |
| `axe-core` | bundled with Lighthouse | Accessibility rule-based testing engine (Deque Systems) |
| `js-yaml` | ^4.1.0 | YAML configuration parsing |
| `ajv` | ^8.17.1 | JSON Schema validation for config and report contracts |
| `ajv-formats` | ^3.0.1 | Additional format validators (date, uri, etc.) |

**No frontend JavaScript frameworks.** All HTML is rendered server-side as static strings.
No build step required.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DAP_API_KEY` | Optional | DAP API authentication key (also via `--dap-api-key` CLI option) |
| `GITHUB_STEP_SUMMARY` | CI only | GitHub Actions output for step summary |
| `GITHUB_TOKEN` | CI only | Used by GitHub Actions for committing and creating issues |

### Quick-Start

```bash
# 1. Clone and install
git clone https://github.com/mgifford/daily-dap.git
cd daily-dap
npm install

# 2. Run the test suite
npm test

# 3. Preview the pipeline (no scans, no writes)
npm run dry-run -- --source-file tests/fixtures/dap-sample.json

# 4. Run a live scan against the DAP top pages
node src/cli/run-daily-scan.js --limit 10
```

---

*This document was generated from a code audit of the Daily DAP repository. For the authoritative
behavioral specification, see `kitty-specs/002-daily-dap-quality-benchmarking/`.*
