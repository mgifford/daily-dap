# Review Gates

**Version**: 1.0.0
**Applies to**: All work packages and missions in this repository.

Work (a work package, feature, or mission) may only move to **approved** status when every
applicable gate below passes. Gates are checked during review, before merge to `main`.
If a gate is not applicable to a change, the reviewer records why.

## Gates

### tests_pass

- `npm test` passes locally or in CI for the change.
- New behavior has test coverage at the appropriate level (unit, contract, integration,
  or BDD acceptance), following existing suites under `tests/`.

### bdd_reviewed

- If the change alters user-visible behavior, the curated behavior specifications in
  `tests/bdd/features/` were reviewed and updated in the same change.
- `tests/bdd/TRACEABILITY.md` remains accurate: new behavior gets a new requirement ID,
  changed behavior updates the mapped scenario summary.
- Ownership expectations in `tests/bdd/OWNERS.md` were respected.

### documentation_updated

- User-facing documentation (`README.md`, `FEATURES.md`, mission artifacts under
  `kitty-specs/`) reflects the change.
- Configuration changes are documented next to the configuration files they affect.

### accessibility_reviewed

- Changes to published HTML output were checked against WCAG 2.2 AA and the guidance in
  `ACCESSIBILITY.md`.
- Rendering of user-controlled or remote content uses `escapeHtml()` or an equivalent
  established sanitization path.

### methodology_reviewed

- Changes to scoring, severity weights, prevalence profiles, traffic windows, sampling,
  or impact formulas were explicitly reviewed and approved by a human maintainer
  (constitution principle P6).
- The methodology documentation and any affected estimates or labels were updated.

### ai_disclosure_updated

- If an AI agent contributed to the change, the `## AI Disclosure` section of `README.md`
  identifies the tool and the nature of the contribution.

## Recording gate results

Reviews record gate outcomes in the pull request (checklist or review comment) using the
gate names above, for example:

```text
tests_pass: pass
bdd_reviewed: n/a (no user-visible behavior change)
documentation_updated: pass
accessibility_reviewed: n/a (no HTML output change)
methodology_reviewed: n/a (no methodology change)
ai_disclosure_updated: pass
```
