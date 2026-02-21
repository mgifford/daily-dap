---
work_package_id: "WP04"
subtasks:
  - "T017"
  - "T018"
  - "T019"
  - "T020"
  - "T021"
  - "T022"
title: "Reporting, Archival, and Public Pages"
phase: "Phase 4 - Publication"
lane: "planned"
dependencies:
  - "WP03"
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

# Work Package Prompt: WP04 – Reporting, Archival, and Public Pages

## Objectives & Success Criteria

- Generate schema-compliant daily report payloads.
- Publish static report pages and history index for GitHub Pages.
- Persist outputs as both committed snapshots and run artifacts.

## Context & Constraints

- Depends on WP03 computed metrics and trend data.
- Must align with `contracts/daily-report.schema.json`.
- Public output must remain static and directly consumable by visitors.

## Subtasks & Detailed Guidance

### Subtask T017 – Daily report payload builder
- **Purpose**: Convert run outputs into canonical report JSON.
- **Steps**:
  1. Build report object with required fields and counts.
  2. Attach trend and impact sections.
- **Files**: `src/publish/build-daily-report.js`.
- **Parallel?**: No.
- **Notes**: Include explicit references to run date and run id.

### Subtask T018 – Static report page rendering
- **Purpose**: Provide human-readable trend/summary views.
- **Steps**:
  1. Generate day-specific `index.html` from report JSON.
  2. Render top-level dashboard page with trend charts.
- **Files**: `docs/reports/index.html`, `src/publish/render-pages.js`.
- **Parallel?**: Yes.
- **Notes**: Keep front-end dependency footprint minimal.

### Subtask T019 – History index generation
- **Purpose**: Support configurable lookback and navigation.
- **Steps**:
  1. Build/update `docs/reports/history.json`.
  2. Respect configured lookback window.
- **Files**: `src/publish/build-history-index.js`, `docs/reports/history.json`.
- **Parallel?**: No.
- **Notes**: Preserve stable ordering (newest first).

### Subtask T020 – Committed snapshot writer
- **Purpose**: Persist date-versioned snapshots for Pages.
- **Steps**:
  1. Write `docs/reports/daily/YYYY-MM-DD/report.json` and `index.html`.
  2. Ensure idempotent overwrite behavior for reruns.
- **Files**: `src/publish/archive-writer.js`, `docs/reports/daily/*`.
- **Parallel?**: No.
- **Notes**: Avoid partial write state on failure.

### Subtask T021 – Artifact bundle manifest
- **Purpose**: Align artifact package with committed snapshot contents.
- **Steps**:
  1. Create artifact manifest and bundle instructions.
  2. Include checksums or content hash references.
- **Files**: `src/publish/artifact-manifest.js`.
- **Parallel?**: Yes.
- **Notes**: Manifest should map to published run id/date.

### Subtask T022 – Schema contract validation
- **Purpose**: Guarantee report payload compatibility.
- **Steps**:
  1. Add contract tests validating report JSON against schema.
  2. Fail build when schema contract breaks.
- **Files**: `tests/contract/report-schema.test.js`.
- **Parallel?**: No.
- **Notes**: Validate both successful and failure-report payload forms.

## Test Strategy

- Execute contract tests and publishing smoke checks.
- Verify generated history and daily files are consumable by static hosting.

## Risks & Mitigations

- **Risk**: Mismatch between artifact and committed snapshot.
- **Mitigation**: build both from same in-memory payload + manifest checks.

## Review Guidance

- Confirm daily report JSON always validates against contract schema.
- Confirm Pages-visible files and archive bundle stay in sync.

## Activity Log

- 2026-02-21T20:12:31Z – system – lane=planned – Prompt generated.
