# Feature Specification: Daily DAP Quality Benchmarking

**Feature Branch**: `002-daily-dap-quality-benchmarking`  
**Created**: 2026-02-21  
**Status**: Draft  
**Input**: User description: "Evaluate daily quality of top DAP pages with ScanGov + Lighthouse, report trends and traffic-weighted impact"

## Clarifications

### Session 2026-02-21

- Q: For traffic-weighted “impacted users,” what rule should classify a page as accessibility-impacting? → A: Weighted model (critical=1.0, serious=0.6, moderate=0.3, minor=0.1).
- Q: Which traffic window should be used for each day’s page-load weighting? → A: Previous calendar day only, with rolling 7-day and rolling 30-day as configurable options.
- Q: For constrained-network performance risk, which threshold should flag a URL as “slow-risk”? → A: Use poor Core Web Vitals status.
- Q: Where should the published historical dataset for GitHub Pages be stored for visitor access? → A: Both Actions artifacts and committed repository snapshots.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Daily Quality Benchmark Publication (Priority: P1)

As a public stakeholder, I can view a daily benchmark report for top DAP pages so I can track quality and accessibility trends over time.

**Why this priority**: The primary value is consistent daily visibility into quality outcomes for high-traffic public pages.

**Independent Test**: Can be fully tested by running a daily cycle and verifying that a new date-stamped report appears with updated aggregate score trendlines.

**Acceptance Scenarios**:

1. **Given** a scheduled daily run, **When** the scan completes, **Then** a new daily report is published with aggregate quality metrics.
2. **Given** multiple daily runs over time, **When** a visitor opens the report page, **Then** they can view trendlines for Performance, Accessibility, Best Practices, SEO, and PWA scores.

---

### User Story 2 - Accessibility Impact Estimation (Priority: P1)

As an advocate or agency team member, I can see accessibility issues tied to pages and an estimated number of impacted users based on traffic and disability prevalence profiles.

**Why this priority**: Actionable accessibility details and impact estimates support prioritization, reporting, and remediation decisions.

**Independent Test**: Can be fully tested by executing a run with known page-load counts and profile values, then verifying estimated impacted counts and percentages in the output.

**Acceptance Scenarios**:

1. **Given** a page with accessibility failures and page-load volume, **When** impact calculations run, **Then** the report includes estimated impacted users by disability profile and overall affected share.
2. **Given** updated disability prevalence values in configuration, **When** the next run executes, **Then** impact estimates reflect the updated values without requiring code changes.

---

### User Story 3 - Historical Archive Navigation (Priority: P2)

As a visitor, I can review recent historical daily reports (default 30 days) so I can compare current outcomes against prior performance.

**Why this priority**: Historical context is required to evaluate progress, regressions, and sustained improvements.

**Independent Test**: Can be tested by generating multiple daily outputs and verifying that the report page exposes a configurable lookback window and links to archived daily reports.

**Acceptance Scenarios**:

1. **Given** archived reports across many days, **When** a visitor views history, **Then** only the configured lookback range is shown by default.
2. **Given** a changed history-window configuration value, **When** reports are regenerated, **Then** the visible trend window matches the configured value.

### Edge Cases

- What happens when fewer URLs are available than the configured limit? The run continues with available URLs and reports the effective sample size.
- What happens when some URL scans fail or time out? Failed URLs are flagged with failure reasons and excluded from score aggregates while still counted in run diagnostics.
- What happens when page-load data is missing for a URL? The report marks missing traffic data and excludes that URL from impacted-user estimates.
- What happens when prevalence profile values are invalid or incomplete? The run fails fast with a clear configuration error and does not publish a misleading report.
- What happens when accessibility findings omit severity labels? The report applies a documented fallback severity weight and flags the record for review.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST ingest the daily top URL list and associated page-load counts from DAP data sources.
- **FR-001a**: System MUST use previous-calendar-day page-load counts as the default weighting input for daily impacted-user calculations.
- **FR-002**: System MUST allow a configurable scan limit per run, with a default of 100 URLs.
- **FR-003**: System MUST run quality scans for each selected URL using both ScanGov indicators and Lighthouse category scoring.
- **FR-004**: System MUST capture page-level accessibility findings in actionable form, including issue category and affected page URL.
- **FR-005**: System MUST calculate daily aggregate Lighthouse metrics for Performance, Accessibility, Best Practices, SEO, and PWA.
- **FR-006**: System MUST compute estimated potentially impacted users by combining page-load counts with configurable disability prevalence profiles.
- **FR-006a**: System MUST apply a weighted accessibility impact model for impacted-user estimation using severity weights: critical=1.0, serious=0.6, moderate=0.3, minor=0.1.
- **FR-007**: System MUST load disability prevalence profiles from a configurable YAML file supporting multiple disability categories.
- **FR-007a**: System MUST allow severity weights and fallback weight behavior to be configured in the same YAML configuration used for prevalence profiles.
- **FR-007b**: System MUST allow configurable traffic weighting windows, including previous-calendar-day (default), rolling 7-day average, and rolling 30-day average.
- **FR-008**: System MUST generate and publish a daily public report and archive each daily report.
- **FR-008a**: System MUST persist each daily output as both a GitHub Actions artifact and a committed repository snapshot used by GitHub Pages.
- **FR-009**: System MUST provide historical trend reporting with a configurable lookback window, defaulting to 30 days.
- **FR-010**: System MUST include constrained-network performance indicators to highlight pages likely to load slowly for mobile and rural contexts.
- **FR-010a**: System MUST classify a URL as constrained-network slow-risk when its Core Web Vitals status is poor.
- **FR-011**: System MUST preserve per-URL daily result data in the published dataset to enable future drill-down views.
- **FR-012**: System MUST clearly separate successful scans, failed scans, and excluded records in daily output summaries.

### Key Entities *(include if feature involves data)*

- **Daily Scan Run**: A dated execution record containing scan configuration, processed URL count, failures, and published outputs.
- **URL Scan Result**: Per-URL result including page URL, page-load count, scan outcomes, Lighthouse category scores, and accessibility findings.
- **Disability Prevalence Profile**: Configurable set of disability categories and prevalence percentages used for impact estimation.
- **Daily Report Snapshot**: Published report artifact containing aggregate metrics, trend values, impacted-user estimates, and archive metadata.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of scheduled daily runs publish either a completed report or an explicit failure report with diagnostic details.
- **SC-002**: At least 95% of selected URLs per run produce usable scan results under normal operating conditions.
- **SC-003**: Daily report pages show complete trendlines for all five Lighthouse categories across the configured historical window.
- **SC-004**: 100% of published daily reports include page-load-weighted impacted-user estimates and affected-share percentages.
- **SC-005**: Historical archives retain at least the configured lookback window and allow visitors to access each day’s published summary.

## Assumptions

- The project continues to use an existing automated daily execution pipeline and public static publishing pipeline.
- Public report consumers initially prioritize aggregate and remediation-oriented accessibility data; richer per-URL drill-down experience can expand later.
- Prevalence profile defaults are provided by project maintainers and can be revised over time.
