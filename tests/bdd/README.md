# Behavior-driven development layer

This directory contains curated, human-readable behavior specifications for Daily DAP.

`FEATURES.md` remains the technical catalog and architecture reference.
The files here are living behavior contracts focused on user-visible outcomes.

## Directory layout

- `tests/bdd/features/ingest/` - ingestion behavior expectations
- `tests/bdd/features/scanning/` - scan execution and status behavior expectations
- `tests/bdd/features/aggregation/` - metric and impact behavior expectations
- `tests/bdd/features/publishing/` - report generation and publication behavior expectations
- `tests/bdd/steps/` - reusable step definitions (shared across features)
- `tests/bdd/support/` - shared world/setup and helper utilities

## Writing rules

1. Specify outcomes that users or operators can observe.
2. Do not lock scenarios to internal implementation details.
3. Use `Rule:` to group related expectations.
4. Use `Scenario Outline` for repeated behavior patterns.
5. Keep scenarios short and business-readable.

## Tags and execution tiers

Use stable tags for traceability and CI tiers:

- `@REQ-<DOMAIN>-<NNN>` - stable requirement identifier
- `@ingest`, `@scan`, `@aggregation`, `@publishing` - domain grouping
- `@tier-pr` - fast scenarios required on pull requests
- `@tier-nightly` - full scenarios for scheduled runs
- `@playwright` - acceptance boundary checks intended for browser automation

Recommended execution policy:

- PR tier: run scenarios tagged `@tier-pr`
- Nightly tier: run `@tier-pr` and `@tier-nightly`, including `@playwright`

## Traceability

Each feature file must include comment references back to relevant sections in:

- `FEATURES.md`

Cross-file scenario mapping is maintained in:

- `tests/bdd/TRACEABILITY.md`

## Step definition and world conventions

- Keep steps thin and reusable.
- Reuse fixtures from `tests/fixtures/`.
- Keep wording UI-agnostic so runner implementations can evolve.
- Reserve Playwright use for acceptance boundaries and rendered report behavior.
- Keep core logic checks in existing unit/contract/integration suites (`npm test`).

## Governance

- Any change to user-facing behavior should update or add behavior scenarios.
- During review, confirm whether behavior scenarios were updated.
- Review and retire stale scenarios quarterly.
