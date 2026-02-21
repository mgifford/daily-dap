---
work_package_id: "WP02"
subtasks:
  - "T006"
  - "T007"
  - "T008"
  - "T009"
  - "T010"
title: "Scanner Execution Layer"
phase: "Phase 2 - Data Collection"
lane: "planned"
dependencies:
  - "WP01"
assignee: ""
agent: ""
shell_pid: ""
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2026-02-21T20:12:31Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
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
