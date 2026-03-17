# Copilot Instructions for Daily DAP

## Primary Agent Instructions

All AI coding agents working on this repository **must** read and follow:

- **[AGENTS.md](../AGENTS.md)** - Quick-reference rules for all agents (path references, UTF-8 encoding, testing, git discipline)
- **[.kittify/AGENTS.md](../.kittify/AGENTS.md)** - Full agent rules including encoding, context management, work quality, and git best practices

## Accessibility Guidelines

This project benchmarks U.S. government website accessibility. All generated HTML and code changes must meet WCAG 2.2 AA standards:

- **[ACCESSIBILITY.md](../ACCESSIBILITY.md)** - Accessibility mission, conformance requirements, HTML generation rules, and AI agent requirements

## Project Overview

**Daily DAP** runs daily Lighthouse and ScanGov scans against the most-visited U.S. government websites and publishes HTML reports benchmarking performance, accessibility, and quality.

**Key facts for efficient work:**

- **Node.js >= 22.19** required; run `npm test` before committing
- **Entry point**: `src/cli/run-daily-scan.js` - orchestrates the full scan pipeline
- **Scanners**: `src/scanners/` - Lighthouse (`lighthouse-runner.js`), ScanGov (`scangov-runner.js`), axe extractor (`axe-extractor.js`)
- **Aggregation**: `src/aggregation/` - impact estimation, FPC exclusion, history series, performance impact
- **Report rendering**: `src/publish/render-pages.js` - all HTML report generation
- **Config**: `src/config/prevalence.yaml` - scan limits, history window, and other tunable parameters
- **Tests**: `tests/` - Node.js built-in test runner; unit, contract, and integration tests

**Security rule**: Always use `escapeHtml()` for any user-controlled or external data rendered in HTML.

**Encoding rule**: Use UTF-8 only - no smart quotes, em dashes, or Windows-1252 characters.

**Path rule**: Always use absolute or project-relative paths (e.g., `src/scanners/lighthouse-runner.js`), never bare filenames.
