# BDD support and world setup guidance

Use this directory for shared BDD support code (world/setup/helpers).

## Conventions

1. Centralize test world creation here instead of per-feature setup.
2. Keep environment setup deterministic and fixture-driven.
3. Keep Playwright usage at acceptance boundaries (rendered output checks).
4. Keep business logic validation in existing unit/contract/integration tests.

## Suggested files

- tests/bdd/support/world.js - shared world and state container
- tests/bdd/support/fixtures.js - fixture loading helpers
- tests/bdd/support/assertions.js - reusable behavior assertions
