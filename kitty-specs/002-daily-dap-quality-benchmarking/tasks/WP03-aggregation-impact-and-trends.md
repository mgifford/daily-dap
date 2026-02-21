---
work_package_id: WP03
title: Aggregation, Impact, and Trends
lane: "for_review"
dependencies:
- WP02
base_branch: 002-daily-dap-quality-benchmarking-WP02
base_commit: c58813bf9e86256c45d7943f1ea1941c15029c05
created_at: '2026-02-21T22:02:18.636125+00:00'
subtasks:
- T011
- T012
- T013
- T014
- T015
- T016
phase: Phase 3 - Metrics and Estimation
assignee: ''
agent: "codex"
shell_pid: "3570"
review_status: ''
reviewed_by: ''
history:
- timestamp: '2026-02-21T20:12:31Z'
  lane: planned
  agent: system
  shell_pid: ''
  action: Prompt generated via /spec-kitty.tasks
---

# Work Package Prompt: WP03 – Aggregation, Impact, and Trends

## Objectives & Success Criteria

- Produce daily aggregate Lighthouse score metrics.
- Implement weighted accessibility impact estimation tied to page-load volume and prevalence profiles.
- Generate configurable history window trend data.

## Context & Constraints

- Depends on normalized per-URL results from WP02.
- Must implement clarified severity model and traffic window options.
- Calculations must be deterministic and testable without external scan execution.

## Subtasks & Detailed Guidance

### Subtask T011 – Aggregate category score engine
- **Purpose**: Compute report-level score summaries.
- **Steps**:
  1. Implement score aggregation for 5 Lighthouse categories.
  2. Exclude failed/excluded URL rows from score means.
- **Files**: `src/aggregation/score-aggregation.js`.
- **Parallel?**: Yes.
- **Notes**: Include record counts used in each aggregate.

### Subtask T012 – Slow-risk classification module
- **Purpose**: Flag constrained-network risk pages.
- **Steps**:
  1. Map CWV status to `slow_risk` boolean.
  2. Add rollup counts of slow-risk URLs and related traffic share.
- **Files**: `src/aggregation/slow-risk.js`.
- **Parallel?**: Yes.
- **Notes**: Rule is poor CWV => slow-risk.

### Subtask T013 – Weighted severity impact formula
- **Purpose**: Implement clarified impact model.
- **Steps**:
  1. Apply severity weights (critical/serious/moderate/minor/fallback).
  2. Combine weighted issue signal with URL page-load count.
  3. Emit intermediate values for auditability.
- **Files**: `src/aggregation/impact-estimation.js`.
- **Parallel?**: Yes.
- **Notes**: Use fallback weight for unknown severities.

### Subtask T014 – Disability category impact expansion
- **Purpose**: Estimate impacted users per configured disability category.
- **Steps**:
  1. Apply prevalence profile to weighted affected traffic.
  2. Emit totals and percentages per category.
- **Files**: `src/aggregation/prevalence-impact.js`.
- **Parallel?**: No.
- **Notes**: Keep category definitions fully config-driven.

### Subtask T015 – Trend window builder
- **Purpose**: Produce history series for configurable lookback.
- **Steps**:
  1. Implement history selection with default 30 days.
  2. Support modes for configurable lookback values.
- **Files**: `src/aggregation/history-series.js`.
- **Parallel?**: No.
- **Notes**: Ensure stable date ordering and missing-day handling.

### Subtask T016 – Unit tests for formulas and windows
- **Purpose**: Prevent regression in critical calculations.
- **Steps**:
  1. Add formula tests for severity weighting and prevalence estimation.
  2. Add tests for daily vs rolling traffic windows.
  3. Add tests for aggregate exclusion rules.
- **Files**: `tests/unit/impact-estimation.test.js`, `tests/unit/score-aggregation.test.js`, `tests/unit/history-series.test.js`.
- **Parallel?**: No.
- **Notes**: Include fixed fixtures with expected outputs.

## Test Strategy

- Run unit suite with fixture inputs and strict expected outputs.
- Validate floating-point rounding/precision strategy for report consistency.

## Risks & Mitigations

- **Risk**: Formula drift or silent math regressions.
- **Mitigation**: fixture-based tests and explicit intermediate value assertions.

## Review Guidance

- Verify the exact clarified weights and traffic window defaults are enforced.
- Confirm failed/excluded rows do not contaminate score aggregates.

## Activity Log

- 2026-02-21T20:12:31Z – system – lane=planned – Prompt generated.
- 2026-02-21T22:02:18Z – codex – shell_pid=3570 – lane=doing – Assigned agent via workflow command
- 2026-02-21T22:39:34Z – codex – shell_pid=3570 – lane=for_review – Ready for review: implemented T011-T016 aggregation, slow-risk rollups, weighted severity impact, prevalence category estimation, and trend windows with unit tests passing (20/20).
