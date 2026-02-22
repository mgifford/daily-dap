---
work_package_id: WP05
title: GitHub Actions Orchestration and E2E Validation
lane: "done"
dependencies:
- WP04
base_branch: 002-daily-dap-quality-benchmarking-WP04
base_commit: 6f2cb43dbbeae4e6a2f87faea59455fe2f148b0c
created_at: '2026-02-21T23:00:24.570930+00:00'
subtasks:
- T023
- T024
- T025
- T026
- T027
- T028
phase: Phase 5 - Operations
assignee: ''
agent: "codex"
shell_pid: "3570"
review_status: "approved"
reviewed_by: "Mike Gifford"
history:
- timestamp: '2026-02-21T20:12:31Z'
  lane: planned
  agent: system
  shell_pid: ''
  action: Prompt generated via /spec-kitty.tasks
---

# Work Package Prompt: WP05 – GitHub Actions Orchestration and E2E Validation

## Objectives & Success Criteria

- Operationalize daily scheduled scans and manual reruns via GitHub Actions.
- Ensure workflow publishes snapshots, uploads artifacts, and emits clear failure reports.
- Validate end-to-end pipeline behavior with smoke and integration checks.

## Context & Constraints

- Depends on WP04 publication and archival modules.
- Must support scheduled daily execution and on-demand dispatch for testing/recovery.
- Workflow must keep public state trustworthy even on partial failures.

## Subtasks & Detailed Guidance

### Subtask T023 – CLI orchestrator command
- **Purpose**: Provide one command for full pipeline stage execution.
- **Steps**:
  1. Implement `run-daily-scan` stage orchestration.
  2. Add flags for run date, URL limit override, traffic window, dry-run mode.
- **Files**: `src/cli/run-daily-scan.js`.
- **Parallel?**: No.
- **Notes**: Return non-zero status on unrecoverable stage failures.

### Subtask T024 – Scheduled workflow implementation
- **Purpose**: Run daily scans automatically and support manual dispatch.
- **Steps**:
  1. Create `.github/workflows/daily-scan.yml` with cron + workflow_dispatch.
  2. Configure runtime, dependencies, and cache strategy.
- **Files**: `.github/workflows/daily-scan.yml`.
- **Parallel?**: Yes.
- **Notes**: Keep critical inputs configurable through workflow env/inputs.

### Subtask T025 – Failure-report publication behavior
- **Purpose**: Preserve transparency when scans fail.
- **Steps**:
  1. Generate explicit failure report payload/page.
  2. Upload diagnostics bundle as artifact.
- **Files**: `src/publish/failure-report.js`, workflow steps.
- **Parallel?**: No.
- **Notes**: Satisfies SC-001 requirement for explicit failure reporting.

### Subtask T026 – Snapshot commit/publish step
- **Purpose**: Ensure daily Pages content is updated from successful runs.
- **Steps**:
  1. Add workflow step to commit/push updated `docs/reports/` snapshots.
  2. Guard commit behavior to avoid empty commits.
- **Files**: `.github/workflows/daily-scan.yml`.
- **Parallel?**: No.
- **Notes**: Include safeguards for branch protection and retries.

### Subtask T027 – Integration smoke tests
- **Purpose**: Verify ingest→scan→aggregate→publish pipeline integrity.
- **Steps**:
  1. Add fixture-based integration smoke tests.
  2. Include tests for partial failures and missing traffic data behavior.
- **Files**: `tests/integration/daily-scan-smoke.test.js`.
- **Parallel?**: Yes.
- **Notes**: Keep runtime short for CI reliability.

### Subtask T028 – Operator runbook and rollback docs
- **Purpose**: Ensure maintainers can recover from failed daily runs.
- **Steps**:
  1. Document rerun workflow and rollback steps.
  2. Document how to adjust config windows/limits safely.
- **Files**: `docs/reports/operations.md` or `README.md` section.
- **Parallel?**: Yes.
- **Notes**: Include troubleshooting for scanner tool errors.

## Test Strategy

- Execute integration smoke tests in CI.
- Dry-run workflow dispatch should complete without publishing.
- Full run should produce both artifact and committed snapshot outputs.

## Risks & Mitigations

- **Risk**: Scheduled workflow failures silently stall updates.
- **Mitigation**: explicit failure reports + artifact diagnostics + status checks.

## Review Guidance

- Validate workflow permissions and push behavior.
- Confirm end-to-end output paths align with WP04 publication structure.

## Activity Log

- 2026-02-21T20:12:31Z – system – lane=planned – Prompt generated.
- 2026-02-21T23:00:24Z – codex – shell_pid=3570 – lane=doing – Assigned agent via workflow command
- 2026-02-21T23:12:21Z – codex – shell_pid=3570 – lane=for_review – Ready for review: implemented full run-daily-scan orchestration, scheduled/manual GitHub Actions workflow, failure-report publication, guarded snapshot commit step, integration smoke coverage, and operator runbook; tests passing (25/25).
- 2026-02-21T23:13:07Z – codex – shell_pid=3570 – lane=doing – Started review via workflow command
- 2026-02-21T23:13:58Z – codex – shell_pid=3570 – lane=done – Review passed: WP05 delivers full orchestration CLI, scheduled/manual GitHub Actions workflow, explicit failure-report publication, guarded snapshot commit behavior, integration smoke tests, and operator runbook; tests pass (25/25); dependency WP04 satisfied and declarations match module coupling/contracts.
