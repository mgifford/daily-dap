# Data Model: Daily DAP Quality Benchmarking

## Entity: DailyScanRun

- **Description**: Metadata and summary for a single date-scoped scan execution.
- **Key fields**:
  - `run_date` (date)
  - `run_id` (string)
  - `url_limit_requested` (integer)
  - `url_count_processed` (integer)
  - `url_count_succeeded` (integer)
  - `url_count_failed` (integer)
  - `traffic_window_mode` (enum: daily|rolling_7d|rolling_30d)
  - `published_snapshot_path` (string)
  - `artifact_reference` (string)

## Entity: UrlScanResult

- **Description**: Per-URL scan and scoring outcome for one run date.
- **Key fields**:
  - `run_id` (string, FK DailyScanRun)
  - `url` (string)
  - `page_load_count` (number)
  - `scan_status` (enum: success|failed|excluded)
  - `failure_reason` (string, optional)
  - `lighthouse_performance` (number)
  - `lighthouse_accessibility` (number)
  - `lighthouse_best_practices` (number)
  - `lighthouse_seo` (number)
  - `lighthouse_pwa` (number)
  - `core_web_vitals_status` (enum: good|needs_improvement|poor|unknown)
  - `slow_risk` (boolean)
  - `accessibility_findings` (array)

## Entity: AccessibilityFinding

- **Description**: Normalized actionable issue detail attached to a URL result.
- **Key fields**:
  - `url` (string)
  - `issue_code` (string)
  - `issue_category` (string)
  - `severity` (enum: critical|serious|moderate|minor|unknown)
  - `message` (string)
  - `selector_or_location` (string, optional)
  - `source_tool` (enum: scangov|lighthouse)

## Entity: PrevalenceProfile

- **Description**: Configured disability prevalence rates and severity weighting model.
- **Key fields**:
  - `profile_name` (string)
  - `disability_rates` (map category->percentage)
  - `severity_weights` (map severity->weight)
  - `fallback_severity_weight` (number)

## Entity: DailyReportSnapshot

- **Description**: Publicly consumable aggregated report for one run date.
- **Key fields**:
  - `run_id` (string)
  - `run_date` (date)
  - `aggregate_scores` (object)
  - `trend_window_days` (integer)
  - `estimated_impacted_users` (object)
  - `affected_share_percent` (number)
  - `history_series` (array)
  - `published_path` (string)

## Relationships

- `DailyScanRun` 1:N `UrlScanResult`
- `UrlScanResult` 1:N `AccessibilityFinding`
- `DailyScanRun` N:1 `PrevalenceProfile`
- `DailyScanRun` 1:1 `DailyReportSnapshot`
