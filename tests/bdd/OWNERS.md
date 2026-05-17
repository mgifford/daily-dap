# BDD ownership and review model

This file defines review ownership for living behavior specifications.

## Domain ownership

| Folder | Primary reviewers | Scope |
|---|---|---|
| `tests/bdd/features/ingest/` | Repository maintainers | DAP source and ingest behavior |
| `tests/bdd/features/scanning/` | Repository maintainers | Scanner execution and status behavior |
| `tests/bdd/features/aggregation/` | Repository maintainers | Aggregation and impact behavior |
| `tests/bdd/features/publishing/` | Repository maintainers | Report generation and rendering behavior |

## Maintenance expectations

1. Any user-visible behavior change must update corresponding feature scenarios.
2. Pull request review should verify whether behavior specs need updates.
3. Quarterly, retire stale scenarios that no longer represent live behavior.
