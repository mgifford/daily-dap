---
work_package_id: WP01
title: Governance Foundation
lane: "for_review"
dependencies: []
base_branch: main
base_commit: e8fc254c39b9759ac0d3906f20812e910ebb9708
created_at: '2026-07-10T00:00:00.000000+00:00'
subtasks:
- T001
- T002
- T003
- T004
- T005
phase: Phase 1 - Governance Foundation
assignee: ''
agent: "claude"
shell_pid: ''
review_status: "pending"
reviewed_by: ''
history:
- timestamp: '2026-07-10T00:00:00Z'
  lane: planned
  agent: system
  shell_pid: ''
  action: Prompt generated for issue #210 governance upgrade
- timestamp: '2026-07-10T00:00:00Z'
  lane: for_review
  agent: claude
  shell_pid: ''
  action: Governance documents authored; awaiting human review
---

# Work Package Prompt: WP01 - Governance Foundation

## Objective

Establish the binding governance layer described in issue #210 and
`kitty-specs/003-spec-kitty-governance-upgrade/spec.md`: project constitution, review
gates, and retrospective template, plus mission artifacts, without changing any runtime
behavior or published report outputs.

## Deliverables

- `.kittify/memory/constitution.md` (T001)
- `.kittify/memory/review-gates.md` (T002)
- `.kittify/memory/retrospective-template.md` (T003)
- `kitty-specs/003-spec-kitty-governance-upgrade/{spec.md,plan.md,tasks.md,meta.json}` (T004)
- `README.md` AI Disclosure update (T005)

## Constraints

- Documentation only: no changes under `src/`, `tests/` behavior, or `docs/reports/`.
- ASCII-safe UTF-8 and project-relative path references per `.kittify/AGENTS.md`.
- `npm test` must pass unchanged.

## Review Guidance

Apply the gates defined in `.kittify/memory/review-gates.md`:

- tests_pass: run `npm test`; no code changed, suite must be green.
- bdd_reviewed: n/a (no user-visible behavior change to published reports).
- documentation_updated: this work package is documentation; verify cross-references
  resolve to real files.
- accessibility_reviewed: n/a (no HTML output change).
- methodology_reviewed: n/a (no methodology change).
- ai_disclosure_updated: verify the `## AI Disclosure` table in `README.md` includes this
  contribution.
