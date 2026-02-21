---
work_package_id: WP01
title: Pipeline Foundation and Configuration
lane: "for_review"
dependencies: []
base_branch: main
base_commit: 9d3d2a1568d59c415559a214ba0862a372698696
created_at: '2026-02-21T20:15:30.629111+00:00'
subtasks:
- T001
- T002
- T003
- T004
- T005
phase: Phase 1 - Foundation
assignee: ''
agent: "codex"
shell_pid: "6888"
review_status: ''
reviewed_by: ''
history:
- timestamp: '2026-02-21T20:12:31Z'
  lane: planned
  agent: system
  shell_pid: ''
  action: Prompt generated via /spec-kitty.tasks
---

# Work Package Prompt: WP01 – Pipeline Foundation and Configuration

## Objectives & Success Criteria

- Establish runnable Node pipeline scaffolding and deterministic run metadata.
- Validate YAML configuration for scan limits, weighting windows, prevalence rates, and severity weights.
- Produce normalized daily URL+page-load input snapshot from DAP sources.

## Context & Constraints

- Core references: `kitty-specs/002-daily-dap-quality-benchmarking/spec.md`, `plan.md`, `research.md`, `data-model.md`.
- Constitution file is absent; use spec requirements as source of truth.
- Configuration errors must fail fast and prevent publishing.

## Subtasks & Detailed Guidance

### Subtask T001 – Scaffold pipeline modules
- **Purpose**: Create baseline project structure to support staged implementation.
- **Steps**:
  1. Create `src/config`, `src/ingest`, `src/scanners`, `src/aggregation`, `src/publish`, `src/cli`.
  2. Add package scripts for local dry run and CI run.
- **Files**: `package.json`, `src/**`.
- **Parallel?**: No.
- **Notes**: Keep script names stable for workflow consumption.

### Subtask T002 – YAML config validation
- **Purpose**: Ensure prevalence and severity settings are safe and explicit.
- **Steps**:
  1. Add parser + schema checks for required config keys.
  2. Validate ranges for prevalence percentages and severity weights.
  3. Validate supported traffic windows (`daily`, `rolling_7d`, `rolling_30d`).
- **Files**: `src/config/prevalence-loader.js`, `src/config/schema.js`, `src/config/prevalence.yaml`.
- **Parallel?**: Yes.
- **Notes**: Provide clear error messages for malformed config.

### Subtask T003 – DAP ingest normalization
- **Purpose**: Standardize URL and page-load inputs for downstream processing.
- **Steps**:
  1. Implement source fetch/parsing adapter.
  2. Normalize to `{url, page_load_count, source_date}` records.
  3. Apply requested URL limit and deterministic ordering.
- **Files**: `src/ingest/dap-source.js`.
- **Parallel?**: Yes.
- **Notes**: Include explicit handling when fewer URLs are available than requested.

### Subtask T004 – Shared run metadata and logging contracts
- **Purpose**: Ensure all outputs are traceable to run/date/config.
- **Steps**:
  1. Implement run metadata generator (`run_id`, run date, mode, limit).
  2. Standardize error and warning event structure.
- **Files**: `src/lib/run-metadata.js`, `src/lib/logging.js`.
- **Parallel?**: No.
- **Notes**: Metadata contract should be reusable by workflow + report builders.

### Subtask T005 – Unit tests for config + ingest
- **Purpose**: Lock core assumptions before scanner integration.
- **Steps**:
  1. Test valid/invalid prevalence config and severity maps.
  2. Test ingest normalization and URL limit behavior.
- **Files**: `tests/unit/config-validation.test.js`, `tests/unit/dap-ingest.test.js`.
- **Parallel?**: No.
- **Notes**: Include fixture cases for missing page-load values.

## Test Strategy

- Run unit tests for config and ingest modules.
- Verify dry-run command outputs normalized record count and run metadata.

## Risks & Mitigations

- **Risk**: DAP payload shape drift.
- **Mitigation**: strict schema normalization + explicit failure event.

## Review Guidance

- Validate deterministic ordering and limit handling.
- Confirm all required config keys are validated with actionable errors.

## Activity Log

- 2026-02-21T20:12:31Z – system – lane=planned – Prompt generated.
- 2026-02-21T20:15:30Z – codex – shell_pid=6888 – lane=doing – Assigned agent via workflow command
- 2026-02-21T20:29:39Z – codex – shell_pid=6888 – lane=for_review – Ready for review: foundation scaffold, config validation, ingest normalization, and tests complete
