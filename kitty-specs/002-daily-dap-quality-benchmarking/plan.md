# Implementation Plan: Daily DAP Quality Benchmarking

**Branch**: `002-daily-dap-quality-benchmarking` | **Date**: 2026-02-21 | **Spec**: `/workspaces/daily-dap/kitty-specs/002-daily-dap-quality-benchmarking/spec.md`
**Input**: Feature specification from `/kitty-specs/002-daily-dap-quality-benchmarking/spec.md`

## Summary

Build a daily GitHub Actions-driven benchmarking pipeline that pulls top DAP URLs plus page loads, runs ScanGov and Lighthouse scans, computes traffic-weighted quality and accessibility impact metrics, and publishes date-versioned reports to GitHub Pages with a configurable historical window (default 30 days).

## Technical Context

**Language/Version**: Node.js 20 LTS (scan orchestration + report build), static HTML/CSS/JS for published pages  
**Primary Dependencies**: Lighthouse CLI, ScanGov tooling/CLI, YAML parser, charting library for trendlines  
**Storage**: Versioned JSON and HTML report artifacts in repository + GitHub Actions artifacts  
**Testing**: Node test runner for aggregation logic, contract/schema validation for report JSON, workflow smoke validation in Actions  
**Target Platform**: GitHub Actions (scheduled + on-demand) and GitHub Pages for public delivery  
**Project Type**: Single project pipeline + static report site  
**Performance Goals**: Daily run completes within scheduled workflow limits for default 100 URLs; trend page load under 3 seconds for visitors  
**Constraints**: No private backend runtime; all published results must be static and publicly viewable; config-driven scan limit and lookback  
**Scale/Scope**: Default 100 URLs/day with option to scale toward 1000 URLs/day; retain historical trend dataset with configurable window

## Planning Inputs Confirmed

- Stack choice: static GitHub Pages frontend + GitHub Actions schedule + Node.js orchestrator.
- Scan set: configurable URL count with default 100.
- Impact model: weighted severity for accessibility findings.
- Traffic weighting window: previous calendar day default; 7-day and 30-day options configurable.
- Publication/archive model: both Actions artifacts and committed repository snapshots.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Constitution file `/workspaces/daily-dap/.kittify/memory/constitution.md` not found.
- Gate result: **Skipped (no constitution defined)**.
- Action: proceed using repository conventions and enforce spec requirements as binding constraints.

## Project Structure

### Documentation (this feature)

```
kitty-specs/002-daily-dap-quality-benchmarking/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── daily-report.schema.json
└── tasks.md
```

### Source Code (repository root)

```
src/
├── config/
│   └── prevalence.yaml
├── ingest/
│   └── dap-source.js
├── scanners/
│   ├── lighthouse-runner.js
│   └── scangov-runner.js
├── aggregation/
│   ├── score-aggregation.js
│   └── impact-estimation.js
├── publish/
│   ├── build-daily-report.js
│   ├── build-history-index.js
│   └── archive-writer.js
└── cli/
  └── run-daily-scan.js

docs/
└── reports/
  ├── index.html
  ├── history.json
  └── daily/
    └── YYYY-MM-DD/
      ├── report.json
      └── index.html

.github/
└── workflows/
  └── daily-scan.yml

tests/
├── unit/
│   ├── impact-estimation.test.js
│   └── score-aggregation.test.js
└── contract/
  └── report-schema.test.js
```

**Structure Decision**: Single-project Node pipeline + static report output is selected to match GitHub Actions execution and GitHub Pages hosting constraints.

## Phase 0: Research & Decisions

1. Verify DAP source extraction strategy for top URLs and daily load counts.
2. Confirm ScanGov result shape for issue-level accessibility output and severity mapping.
3. Confirm Lighthouse execution settings for stable daily comparison and CWV status extraction.
4. Define archive retention and lookback computation behavior for history generation.
5. Define failure-handling policy for partial scan completion and report publication behavior.

**Output artifact**: `research.md` with decision, rationale, and alternatives.

## Phase 1: Design & Contracts

1. Design canonical data entities and relationships for daily run, per-URL result, prevalence profile, and published snapshots.
2. Define output contract/schema for daily report JSON consumed by GitHub Pages.
3. Define quickstart runbook for local and CI execution, including configuration knobs.
4. Document calculation formulas for weighted accessibility impact and affected-share percentage.
5. Re-check constitution gate (skipped unless constitution appears before implementation).

**Output artifacts**:

- `/workspaces/daily-dap/kitty-specs/002-daily-dap-quality-benchmarking/data-model.md`
- `/workspaces/daily-dap/kitty-specs/002-daily-dap-quality-benchmarking/contracts/daily-report.schema.json`
- `/workspaces/daily-dap/kitty-specs/002-daily-dap-quality-benchmarking/quickstart.md`

## Risks & Mitigations

- **External data volatility**: DAP source shape may change. Mitigation: strict ingest validation and fallback failure report.
- **Scan runtime growth**: 1000 URL scans may exceed schedule windows. Mitigation: configurable parallelism, timeout budget, and partial publish mode.
- **Metric comparability drift**: scanner versions/settings could change. Mitigation: pin tool versions and include run metadata in report.
- **Impact estimate misinterpretation**: prevalence-based estimates can be over-read. Mitigation: include assumptions and confidence disclaimers in report output.

## Complexity Tracking

No constitution violations to justify (constitution unavailable).