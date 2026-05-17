# BDD step definition guidance

Use this directory for reusable step definitions.

## Conventions

1. Keep steps thin and delegate logic to existing test helpers or production modules.
2. Avoid duplicate steps that differ only in wording.
3. Reuse fixtures from `tests/fixtures/`.
4. Keep scenario language stable even if underlying test runner changes.

## Suggested organization

- `tests/bdd/steps/common/` for cross-domain steps
- `tests/bdd/steps/<domain>/` for domain-specific steps
