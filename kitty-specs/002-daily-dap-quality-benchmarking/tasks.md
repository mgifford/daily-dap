---
description: "Work packages for Daily DAP Quality Benchmarking"
---

# Work Packages: Daily DAP Quality Benchmarking

**Inputs**: Design documents from `/kitty-specs/002-daily-dap-quality-benchmarking/`  
**Prerequisites**: plan.md (required), spec.md, research.md, data-model.md, contracts/daily-report.schema.json, quickstart.md

**Tests**: Include explicit unit, contract, and integration checks for score aggregation, impact estimation, schema validity, and end-to-end workflow stability.

**Organization**: Fine-grained subtasks (`Txxx`) roll up into work packages (`WPxx`). Each work package is independently reviewable and produces tangible artifacts.

**Prompt Files**: Work package prompts live in `/tasks/` and contain implementation-level details.

## Subtask Format: `[Txxx] [P?] Description`
- **[P]** indicates parallelizable work on separate files/concerns.
- Every subtask references intended files.

## Path Conventions
- Pipeline source: `src/`
- Report output: `docs/reports/`
- Workflow automation: `.github/workflows/`
- Tests: `tests/unit/`, `tests/contract/`, `tests/integration/`

---

## Work Package WP01: Pipeline Foundation & Configuration (Priority: P0) 🎯 Foundation

**Goal**: Establish repository structure, configuration model, and DAP ingest foundation for all downstream work.  
**Independent Test**: A dry run loads configuration and retrieves/normalizes URL + page-load input without scanner execution.  
**Prompt**: `/tasks/WP01-pipeline-foundation-and-configuration.md`

### Included Subtasks
- [ ] T001 Create project structure and package scripts for scan pipeline entrypoints.
- [ ] T002 Implement YAML configuration loading with validation for URL limit, lookback, prevalence rates, and severity weights.
- [ ] T003 Implement DAP ingest module that produces normalized URL + page-load inputs for selected traffic window.
- [ ] T004 Add run metadata model (`run_id`, date, mode, counts) and shared logging/error contracts.
- [ ] T005 Add unit tests for configuration parsing and ingest normalization.

### Implementation Notes
- Build deterministic run metadata early to ensure all downstream outputs are traceable.
- Fail fast on malformed configuration to avoid publishing invalid reports.

### Parallel Opportunities
- T002 and T003 can proceed in parallel after basic project scaffolding.

### Dependencies
- None.

### Risks & Mitigations
- **Risk**: DAP source variability causes ingest instability.  
  **Mitigation**: strict normalization and explicit fallback failure states.

---

## Work Package WP02: Scanner Execution Layer (Priority: P1)

**Goal**: Execute Lighthouse + ScanGov for each URL and emit normalized per-URL scan records with status tracking.  
**Independent Test**: Given a fixture URL list, scanner layer outputs success/failed/excluded records with normalized fields.  
**Prompt**: `/tasks/WP02-scanner-execution-layer.md`

### Included Subtasks
- [ ] T006 Implement Lighthouse runner with consistent execution settings and category extraction.
- [ ] T007 Implement ScanGov runner with issue-level extraction including severity and category details.
- [ ] T008 Implement per-URL normalization into `UrlScanResult` + `AccessibilityFinding` structures.
- [ ] T009 Add concurrency, timeout, and retry controls for scan stability.
- [ ] T010 Implement scan-status segregation (`success`, `failed`, `excluded`) with explicit failure reasons.

### Implementation Notes
- Keep scanner adapters isolated so tool updates do not cascade through aggregation logic.
- Preserve raw tool references in normalized output for debugging and auditability.

### Parallel Opportunities
- T006 and T007 are parallelizable.
- T009 can be developed in parallel after runner shells exist.

### Dependencies
- Depends on WP01.

### Risks & Mitigations
- **Risk**: Runtime spikes at higher URL counts.  
  **Mitigation**: bounded concurrency and configurable timeout budgets.

---

## Work Package WP03: Aggregation, Impact & Trends (Priority: P1) 🎯 MVP

**Goal**: Compute aggregate Lighthouse metrics, weighted accessibility impact estimates, and trend-window datasets.  
**Independent Test**: Fixture scan results produce deterministic daily aggregate scores and impacted-user estimates.  
**Prompt**: `/tasks/WP03-aggregation-impact-and-trends.md`

### Included Subtasks
- [ ] T011 Implement aggregate score calculations for Performance, Accessibility, Best Practices, SEO, and PWA.
- [ ] T012 Implement constrained-network slow-risk classification using poor Core Web Vitals status.
- [ ] T013 Implement weighted accessibility impact model (critical=1.0, serious=0.6, moderate=0.3, minor=0.1, fallback handling).
- [ ] T014 Implement disability-category impacted-user estimation from prevalence profile and page-load weighting.
- [ ] T015 Implement trend-window selection (default 30 days, configurable) and historical series generation.
- [ ] T016 Add unit tests for aggregation and impact formulas, including traffic window variants.

### Implementation Notes
- Calculations must be deterministic and independently testable from scanner execution.
- Keep formula implementations separate from rendering concerns.

### Parallel Opportunities
- T011, T012, and T013 can run in parallel once normalized scan outputs are available.

### Dependencies
- Depends on WP02.

### Risks & Mitigations
- **Risk**: Misinterpretation of estimates.  
  **Mitigation**: include explicit assumptions/disclaimer fields in output payload.

---

## Work Package WP04: Reporting, Archival & Public Pages (Priority: P1)

**Goal**: Publish daily report snapshots to GitHub Pages and archive each run in both repository snapshots and artifact bundles.  
**Independent Test**: A generated run produces `docs/reports/daily/YYYY-MM-DD/` assets, updates history index, and validates report schema.  
**Prompt**: `/tasks/WP04-reporting-archival-and-public-pages.md`

### Included Subtasks
- [ ] T017 Implement daily report JSON builder conforming to `contracts/daily-report.schema.json`.
- [ ] T018 Implement static page rendering for daily report and top-level trendline view.
- [ ] T019 Implement history index generation (`history.json`) honoring configurable lookback window.
- [ ] T020 Implement committed snapshot writer for GitHub Pages paths.
- [ ] T021 Implement artifact packaging manifest for run outputs and metadata references.
- [ ] T022 Add contract/schema validation tests for generated report payloads.

### Implementation Notes
- Keep published data contract stable; UI should consume contract, not internal raw structures.
- Ensure idempotent regeneration for same run date.

### Parallel Opportunities
- T018 and T021 can proceed in parallel after report JSON shape is fixed.

### Dependencies
- Depends on WP03.

### Risks & Mitigations
- **Risk**: History drift between artifact and committed snapshot.
  **Mitigation**: generate both from same canonical run payload and checksum output.

---

## Work Package WP05: GitHub Actions Orchestration & E2E Validation (Priority: P1)

**Goal**: Operationalize daily scheduled execution, failure reporting, and end-to-end validation for reliable public reporting.  
**Independent Test**: Scheduled/manual workflow produces a full run, uploads artifacts, commits snapshots, and emits clear failure report when broken.  
**Prompt**: `/tasks/WP05-github-actions-orchestration-and-e2e-validation.md`

### Included Subtasks
- [ ] T023 Implement CLI orchestrator (`run-daily-scan`) that executes ingest → scan → aggregate → publish pipeline stages.
- [ ] T024 Implement GitHub Actions workflow with schedule + manual dispatch and configurable runtime inputs.
- [ ] T025 Implement workflow-level failure report generation and non-success run publication behavior.
- [ ] T026 Implement repository update/publish step for daily snapshot outputs.
- [ ] T027 Add integration smoke test(s) using fixture URL sets and stubbed scanner output mode.
- [ ] T028 Document operator runbook and rollback procedures for failed daily runs.

### Implementation Notes
- Workflow must support safe reruns for the same date.
- Separate operational diagnostics from public report content.

### Parallel Opportunities
- T024 and T027 can be prepared in parallel after CLI orchestration contract is defined.

### Dependencies
- Depends on WP04.

### Risks & Mitigations
- **Risk**: Workflow failures leave stale public state.
  **Mitigation**: atomic publish sequencing and explicit failure artifact/report output.

---

## Dependency & Execution Summary

- **Sequence**: WP01 → WP02 → WP03 → WP04 → WP05.
- **Parallelization**: Internal subtasks marked `[P]` in each WP can run concurrently by file/module boundaries.
- **MVP Scope**: WP01–WP03 (foundation + scans + aggregate metrics/impact). Public reporting requires WP04.

---

## Subtask Index (Reference)

| Subtask ID | Summary | Work Package | Priority | Parallel? |
|------------|---------|--------------|----------|-----------|
| T001 | Project scaffold and scripts | WP01 | P0 | No |
| T002 | YAML config validation | WP01 | P0 | Yes |
| T006 | Lighthouse runner | WP02 | P1 | Yes |
| T007 | ScanGov runner | WP02 | P1 | Yes |
| T013 | Weighted accessibility impact model | WP03 | P1 | Yes |
| T017 | Daily report JSON builder | WP04 | P1 | No |
| T024 | Scheduled GitHub Actions workflow | WP05 | P1 | Yes |
| T027 | End-to-end smoke validation | WP05 | P1 | Yes |

---

> These work packages are optimized for incremental delivery and clear review boundaries while preserving deterministic daily reporting outcomes.
