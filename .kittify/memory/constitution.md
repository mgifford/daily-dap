# Daily DAP Project Constitution

**Version**: 1.0.0
**Ratified**: 2026-07-10
**Applies to**: All missions, features, and contributions (human or AI) in this repository.

This constitution defines the binding principles for the Daily DAP project. Mission plans
must include a Constitution Check gate that verifies compliance with this document before
implementation begins (see `kitty-specs/002-daily-dap-quality-benchmarking/plan.md` for the
gate format). Where a mission conflicts with this constitution, the constitution wins unless
an amendment is ratified first.

## Principles

### P1. Accessibility is a primary quality metric

- Accessibility is a first-class output of this project, not a secondary check.
- All published HTML (reports, index pages, archives) must meet WCAG 2.2 AA.
- Changes that reduce the accessibility of published pages are defects, even when tests pass.
- Project-specific guidance lives in `ACCESSIBILITY.md` and is binding.

### P2. Published metrics must be reproducible

- Every published number must be derivable from versioned inputs: configuration in
  `src/config/`, source data references, and code in `src/`.
- Daily report snapshots are committed under `docs/reports/` so any published day can be
  audited later.
- Non-deterministic steps (live scans, remote fetches) must record enough run metadata
  (run id, date, mode, counts, failures) for a reader to understand what was measured.

### P3. Methodology is transparent

- Scoring, weighting, severity mapping, and impact-estimation methods must be documented in
  public repository files (`README.md`, `FEATURES.md`, `kitty-specs/`), not only in code.
- Estimates must be labeled as estimates, with their data sources named (for example the
  Census ACS disability prevalence data in `src/config/prevalence.yaml`).
- Known limitations (bot traffic inclusion, sampling limits, scanner gaps) are disclosed
  next to the numbers they affect.

### P4. AI contributions are disclosed

- AI agents that contribute code, documentation, or planning must update the
  `## AI Disclosure` section of `README.md`, identifying the tool, version where known,
  and the nature of the contribution.
- Tools that were not used must not be listed.
- AI-generated methodology changes require human review before merge (see P6).

### P5. Open standards and open data are preferred

- Prefer open, documented formats (JSON, YAML, CSV, static HTML) over proprietary ones.
- Published datasets and reports must remain publicly readable without authentication
  (see `kitty-specs/001-anonymous-public-access/`).
- Prefer public, citable upstream sources (DAP, Census ACS, CISA dotgov data) and record
  the endpoint or dataset vintage used.

### P6. Methodology changes require human review

- Any change to scoring, severity weights, prevalence profiles, traffic windows, sampling,
  or impact formulas must be reviewed and approved by a human maintainer before it takes
  effect in published reports.
- Such changes must update the relevant documentation and, when user-visible behavior
  changes, the curated behavior specifications (see Governance: BDD linkage).

### P7. Public interest comes first

- The project exists to improve public-facing government services. Decisions are weighed
  by their effect on people using those services, prioritizing high-traffic pages where
  regressions affect the most people.
- Features that serve vanity metrics at the expense of clarity or accuracy are out of scope.

## Governance

### Review gates

Work cannot move to approved status until the documented review gates pass. The gates and
their meanings are defined in `.kittify/memory/review-gates.md`.

### BDD linkage

The repository maintains curated behavior specifications with stable requirement IDs:

- Feature files: `tests/bdd/features/`
- Traceability matrix: `tests/bdd/TRACEABILITY.md`
- Ownership model: `tests/bdd/OWNERS.md`

Whenever user-visible behavior changes, the corresponding behavior specification must be
reviewed and updated in the same change, and the traceability matrix kept accurate. New
user-visible behavior requires a new requirement ID.

### Retrospectives

Each completed mission ends with a retrospective using the format in
`.kittify/memory/retrospective-template.md`. Retrospectives are stored in the mission
directory as `kitty-specs/<mission>/retrospective.md` and become part of the project's
institutional memory.

### Mission conventions

Future missions follow the lifecycle model established by
`kitty-specs/003-spec-kitty-governance-upgrade/`: specify, plan (with Constitution Check),
tasks, implement, review (gates), accept, retrospective.

### Amendments

- Amendments are proposed as pull requests editing this file, with rationale.
- A human maintainer must approve amendments; AI agents may draft but not ratify.
- Version is bumped semantically: clarifications are patch, new or expanded principles are
  minor, removed or redefined principles are major.
- Ratified amendments update the version and date at the top of this file.
