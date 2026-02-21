# Quickstart: Daily DAP Quality Benchmarking

## 1. Configure run settings

1. Set URL scan limit (default 100).
2. Set history lookback window (default 30 days).
3. Configure prevalence profile and severity weights in YAML.
4. Select traffic weighting mode (`daily`, `rolling_7d`, or `rolling_30d`).

## 2. Run a local dry cycle

1. Ingest latest DAP URL + load-count snapshot.
2. Run ScanGov and Lighthouse scans for selected URLs.
3. Generate normalized per-URL result output.
4. Compute aggregate trend metrics and impacted-user estimates.
5. Validate output against `contracts/daily-report.schema.json`.

## 3. Publish daily output

1. Build date-stamped report assets.
2. Write committed snapshot data for GitHub Pages.
3. Upload full run bundle as GitHub Actions artifact.
4. Regenerate history index constrained to configured lookback window.

## 4. Validate acceptance checks

- Daily report exists for run date.
- Trendline data includes all five Lighthouse categories.
- Impact metrics include weighted severity and traffic-weighted outputs.
- Failed and excluded URLs are clearly separated from successful scans.
- Archive includes both artifact reference and committed snapshot path.
