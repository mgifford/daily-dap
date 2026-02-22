# Daily DAP Quality Benchmarking

Daily DAP benchmarks the quality and accessibility of the most visited U.S. government pages.
It prioritizes high-traffic pages because regressions on those pages affect the most people seeking public services.

## Why this project exists

Public-facing government websites are critical infrastructure. When heavily used pages have accessibility,
performance, or usability issues, impact is broad and immediate.

This project provides a daily, repeatable quality signal by:

- pulling top pages from DAP traffic data,
- scanning those pages with Lighthouse and ScanGov,
- aggregating quality and impact metrics,
- publishing dated static reports and trend history.

## DAP and related resources

- Digital Analytics Program (DAP): https://digital.gov/guides/dap/
- Analytics.USA.gov overview: https://analytics.usa.gov/
- DAP data endpoint configured in this repo: `src/config/prevalence.yaml`
- ScanGov (accessibility scanner): https://github.com/GSA/scan-gov
- Lighthouse: https://developer.chrome.com/docs/lighthouse/overview/

## Current implementation status

- WP01–WP04 are implemented through report payload generation, static rendering, archive writing, and schema contract tests.
- WP05 will finalize end-to-end CLI orchestration and scheduled CI automation for the full production run.

## Expected end-to-end action (ingest → scan → report)

The intended operator action is:

1. Pull top DAP URLs and page-load counts.
2. Run Lighthouse + ScanGov scans for each selected URL.
3. Aggregate scores and accessibility impact estimates.
4. Generate and publish dated report snapshots under `docs/reports/`.

This workflow is represented by the CLI entrypoint and work package stack:

- Current entrypoint scaffold: `src/cli/run-daily-scan.js`
- Full orchestration completion target: WP05

## Local development commands

- Install dependencies:
	- `npm install`
- Run tests:
	- `npm test`
- Run current dry-run pipeline preview:
	- `npm run dry-run -- --source-file tests/fixtures/dap-sample.json`

## Output locations

- Daily published snapshots: `docs/reports/daily/YYYY-MM-DD/`
- History index: `docs/reports/history.json`
- Top-level dashboard page: `docs/reports/index.html`

## Project structure

- `src/config/` configuration schema + prevalence inputs
- `src/ingest/` DAP source ingestion + normalization
- `src/scanners/` Lighthouse/ScanGov execution + normalization
- `src/aggregation/` metrics, impact, and trends
- `src/publish/` report building, static rendering, archive + manifest
- `tests/unit/` unit tests
- `tests/contract/` schema contract validation
- `kitty-specs/002-daily-dap-quality-benchmarking/` specification and work packages
