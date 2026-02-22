---
work_package_id: WP02
title: Scanner Execution Layer
lane: "done"
dependencies:
- WP01
base_branch: 002-daily-dap-quality-benchmarking-WP01
base_commit: f14ce0e83305e07ec1fbe4db2a5030cff44d6485
created_at: '2026-02-21T20:37:59.357606+00:00'
subtasks:
- T006
- T007
- T008
- T009
- T010
phase: Phase 2 - Data Collection
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

# Work Package Prompt: WP02 – Scanner Execution Layer

## Objectives & Success Criteria

- Execute Lighthouse and ScanGov for each URL with stable settings.
- Emit normalized per-URL results including accessibility findings and scan status.
- Enforce timeout/concurrency boundaries to preserve daily workflow reliability.

## Context & Constraints

- Depends on WP01 normalized inputs and run metadata.
- Must produce fields required by `data-model.md` for `UrlScanResult` and `AccessibilityFinding`.
- Failed scans must remain visible and excluded from aggregate calculations.

## Subtasks & Detailed Guidance

### Subtask T006 – Lighthouse runner implementation
- **Purpose**: Collect category scores and Core Web Vitals status consistently.
- **Steps**:
  1. Implement runner wrapper and execution options.
  2. Extract Performance, Accessibility, Best Practices, SEO, PWA scores.
  3. Capture CWV status classification.
- **Files**: `src/scanners/lighthouse-runner.js`.
- **Parallel?**: Yes.
- **Notes**: Pin runner settings for longitudinal comparability.

### Subtask T007 – ScanGov runner implementation
- **Purpose**: Produce actionable accessibility finding details.
- **Steps**:
  1. Implement ScanGov adapter for URL scans.
  2. Extract issue code, category, severity, message, selector/location.
- **Files**: `src/scanners/scangov-runner.js`.
- **Parallel?**: Yes.
- **Notes**: Preserve source-tool provenance on findings.

### Subtask T008 – Per-URL normalization contract
- **Purpose**: Standardize scanner outputs into a unified schema.
- **Steps**:
  1. Build normalizer that merges ingest + scanner outputs.
  2. Produce canonical `scan_status` values.
  3. Map unknown severity to fallback marker.
- **Files**: `src/scanners/result-normalizer.js`.
- **Parallel?**: No.
- **Notes**: Keep raw references for diagnostics.

### Subtask T009 – Concurrency/timeout/retry controls
- **Purpose**: Avoid workflow instability at larger URL counts.
- **Steps**:
  1. Add configurable worker pool limits.
  2. Add timeout and bounded retry policy.
  3. Track timeout/retry reasons in scan diagnostics.
- **Files**: `src/scanners/execution-manager.js`.
- **Parallel?**: Yes.
- **Notes**: Ensure defaults work for 100 URL scans.

### Subtask T010 – Status segregation and diagnostics
- **Purpose**: Separate successful, failed, and excluded records.
- **Steps**:
  1. Implement classification and failure reason catalog.
  2. Emit per-run scan diagnostics summary.
- **Files**: `src/scanners/status-classifier.js`, `src/scanners/diagnostics.js`.
- **Parallel?**: No.
- **Notes**: Needed for FR-012 and SC-001 diagnostics.

## Test Strategy

- Add scanner adapter tests using controlled fixtures/mocks.
- Validate status segregation behavior under timeout and malformed output cases.

## Risks & Mitigations

- **Risk**: Tool output changes break parsers.
- **Mitigation**: defensive parsing + schema assertions per tool adapter.

## Review Guidance

- Confirm normalized output includes all required per-URL fields.
- Validate timeout/retry controls are configurable and bounded.

## Activity Log

- 2026-02-21T20:12:31Z – system – lane=planned – Prompt generated.
- 2026-02-21T20:37:59Z – codex – shell_pid=6888 – lane=doing – Assigned agent via workflow command
- 2026-02-21T21:55:08Z – codex – shell_pid=6888 – lane=for_review – Ready for review: implemented T006-T010 scanner execution layer (Lighthouse + ScanGov runners, per-URL normalization, bounded retry/timeout execution manager, and status/diagnostics), with unit tests passing (13/13).
- 2026-02-21T21:57:13Z – codex – shell_pid=3570 – lane=doing – Started review via workflow command
- 2026-02-21T21:58:31Z – codex – shell_pid=3570 – lane=done – Review passed: WP02 scanner execution layer satisfies T006-T010; tests pass (13/13); dependency WP01 is on main; dependent WP03 is planned; dependency declarations match staged coupling boundaries.
