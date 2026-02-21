# Daily DAP Operations Runbook

## Operational goals

- Keep daily report publication continuous and transparent.
- Preserve artifact diagnostics for every run.
- Support safe reruns and controlled rollback when publication errors occur.

## Routine execution

- Scheduled execution is handled by `.github/workflows/daily-scan.yml`.
- Manual rerun is available via workflow dispatch inputs:
  - `run_date`
  - `url_limit`
  - `traffic_window`
  - `dry_run`

## Local operator commands

- Dry run validation:
  - `npm run dry-run -- --source-file tests/fixtures/dap-sample.json`
- Full mock orchestration run:
  - `node src/cli/run-daily-scan.js --source-file tests/fixtures/dap-sample.json --scan-mode mock`
- Run a specific date:
  - `node src/cli/run-daily-scan.js --date 2026-02-21 --scan-mode mock --source-file tests/fixtures/dap-sample.json`

## Failure handling

When a run fails:

- Failure payload is written to `docs/reports/daily/YYYY-MM-DD/report.json`.
- Failure page is written to `docs/reports/daily/YYYY-MM-DD/index.html`.
- Diagnostics summary is written to `artifacts/YYYY-MM-DD/run-summary.json`.
- Workflow uploads the diagnostics bundle as a GitHub Actions artifact.

## Recovery and rollback

1. Inspect latest workflow run logs and uploaded artifact.
2. Confirm whether failure is environmental (transient) or functional (code/data contract).
3. For transient failures, rerun workflow dispatch for the same date.
4. For functional issues, fix on a branch and rerun manually in dry-run mode first.
5. If published snapshot is bad, revert only affected `docs/reports/` paths and re-run publish workflow.

## Safe config changes

- Edit `src/config/prevalence.yaml` for:
  - `scan.url_limit`
  - `scan.history_lookback_days`
  - `scan.traffic_window_mode`
  - impact prevalence rates and severity weights
- Validate with:
  - `npm test`
  - `npm run dry-run -- --source-file tests/fixtures/dap-sample.json`

## Troubleshooting notes

- Scanner execution failures are expected to produce partial reports rather than silent drops.
- Missing page-load counts are retained for diagnostics and excluded from weighted traffic math.
- Avoid empty snapshot commits: workflow already checks for docs changes before committing.
