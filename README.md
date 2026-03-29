# Daily DAP Quality Benchmarking

Daily DAP benchmarks the quality and accessibility of the most visited U.S. government pages.
It prioritizes high-traffic pages because regressions on those pages affect the most people seeking public services.

## Why this project exists

Public-facing government websites are critical infrastructure. When heavily used pages have accessibility,
performance, or usability issues, impact is broad and immediate.

This project provides a daily, repeatable quality signal by:

- pulling top pages from DAP traffic data,
- scanning those pages with Lighthouse and ScanGov,
- aggregating quality and impact metrics,
- publishing dated static reports and trend history.

## DAP and related resources

- Digital Analytics Program (DAP): https://digital.gov/guides/dap/
- Analytics.USA.gov overview: https://analytics.usa.gov/
- DAP data endpoint configured in this repo: `src/config/prevalence.yaml`
- ScanGov (accessibility scanner): https://github.com/GSA/scan-gov
- Lighthouse: https://developer.chrome.com/docs/lighthouse/overview/

## Current implementation status

- WP01–WP04 are implemented through report payload generation, static rendering, archive writing, and schema contract tests.
- WP05 will finalize end-to-end CLI orchestration and scheduled CI automation for the full production run.

## Expected end-to-end action (ingest → scan → report)

The intended operator action is:

1. Pull top DAP URLs and page-load counts.
2. Run Lighthouse + ScanGov scans for each selected URL.
3. Aggregate scores and accessibility impact estimates.
4. Generate and publish dated report snapshots under `docs/reports/`.

This workflow is represented by the CLI entrypoint and work package stack:

- Current entrypoint scaffold: `src/cli/run-daily-scan.js`
- Full orchestration completion target: WP05

## Local development commands

- Install dependencies:
	- `npm install`
- Run tests:
	- `npm test`
- Run current dry-run pipeline preview:
	- `npm run dry-run -- --source-file tests/fixtures/dap-sample.json`

## CLI options

The `run-daily-scan.js` CLI supports the following options to control scan behavior:

### Rate limiting and performance
- `--concurrency <number>` - Number of parallel scans (default: 2)
- `--timeout-ms <number>` - Timeout per URL scan in milliseconds (default: 90 seconds / 90000ms)
- `--max-retries <number>` - Maximum retry attempts for failed scans (default: 2)
- `--retry-delay-ms <number>` - Delay between retry attempts in milliseconds (default: 2 seconds / 2000ms)
- `--inter-scan-delay-ms <number>` - Delay between individual URL scans in milliseconds (default: 1 second / 1000ms)

### Data sources
- `--source-file <path>` - Load URLs from a local JSON file instead of the DAP API
- `--dap-api-key <key>` - DAP API key (can also use DAP_API_KEY environment variable)
- `--limit <number>` - Override URL limit from config
- `--traffic-window <mode>` - Traffic window mode: daily, rolling_7d, or rolling_30d

### Execution modes
- `--scan-mode <mode>` - Scanner mode: live or mock (default: live)
- `--dry-run` - Preview configuration without running scans
- `--date <YYYY-MM-DD>` - Override run date

### Example usage
```bash
# Run with custom rate limiting for slower networks
node src/cli/run-daily-scan.js --concurrency 1 --timeout-ms 120000 --inter-scan-delay-ms 2000

# Test with a small sample
node src/cli/run-daily-scan.js --source-file tests/fixtures/dap-sample.json --limit 5

# Dry run to preview configuration
node src/cli/run-daily-scan.js --dry-run --limit 10
```

## Output locations

- Daily published snapshots: `docs/reports/daily/YYYY-MM-DD/`
- History index: `docs/reports/history.json`
- Top-level dashboard page: `docs/reports/index.html`

## Project structure

- `src/config/` configuration schema + prevalence inputs
- `src/ingest/` DAP source ingestion + normalization
- `src/scanners/` Lighthouse/ScanGov execution + normalization
- `src/aggregation/` metrics, impact, and trends
- `src/publish/` report building, static rendering, archive + manifest
- `tests/unit/` unit tests
- `tests/contract/` schema contract validation
- `kitty-specs/002-daily-dap-quality-benchmarking/` specification and work packages

## Documentation

- [ACCESSIBILITY.md](./ACCESSIBILITY.md) - Accessibility commitment, best practices, and guidelines
- [AGENTS.md](./AGENTS.md) - AI agent instructions and project-specific rules
- [FEATURES.md](./FEATURES.md) - Comprehensive technical feature catalog and international adaptation guide
- [STYLES.md](./STYLES.md) - Design and content standards aligned with the CivicActions Style Guide

## AI Disclosure

This project is transparent about how AI tools have been used throughout its development and operation.

### Building the project

| LLM / AI Tool | Version | Role |
|---------------|---------|------|
| GitHub Copilot | (current) | Primary implementation agent: wrote source code, tests, and documentation for all work packages (WP01-WP05) via the spec-kitty workflow |
| Claude (Anthropic) | claude-sonnet-4.5 | Code review, documentation updates, and incremental feature implementation via GitHub Copilot coding agent; added NN/g usability heuristics alignment feature |
| Claude (Anthropic) | claude-sonnet-4-5 | Added Call to Action section to daily reports with Section 508 links, Open Scans promotion, tool recommendations, USWDS adoption, and disability hiring messaging |
| Claude (Anthropic) | claude-sonnet-4-5 | Added domain-to-organization enrichment: fetches CISA .gov registry (cisagov/dotgov-data) at scan time and displays the owning agency name below each URL in the top-URLs table |
| Claude (Anthropic) | claude-sonnet-4-5 | Created FEATURES.md: comprehensive technical feature catalog covering all modules, CLI options, workflows, data files, and international adaptation guide |
| Claude (Anthropic) | claude-sonnet-4-5 | Added required federal links checker (OMB M-17-06): detects Privacy Policy, Contact, and FOIA pages, inspired by the performance.gov website performance initiative |
| Claude (Anthropic) | claude-sonnet-4.6 | Created STYLES.md: design and content standards aligned with CivicActions brand, colors, typography, and style guide conventions; added STYLES.md link to README documentation section |
| Claude (Anthropic) | claude-sonnet-4.6 | CivicActions brand alignment: updated CSS color tokens (primary red #D83933, dark blue #162E51, secondary blue #1A4480), font stack (Public Sans), footer attribution, and tests in render-pages.js and index.html |
| Claude (Anthropic) | claude-sonnet-4.6 | CI/CD improvements: added dedicated CI workflow for tests on PRs, upgraded accessibility scanner to v3, removed redundant push trigger from scan-github-pages workflow, added open-issues gate to prevent alert fatigue |

### Runtime operation

No LLMs or AI models are invoked when the program runs. The scanning pipeline uses:

- **Lighthouse** (Google) - automated performance, accessibility, SEO, and best-practices auditing
- **axe-core** (Deque Systems) - rule-based accessibility testing engine (bundled inside Lighthouse)
- **ScanGov** (GSA) - government website quality scanning

None of these tools use large language models.

### Browser-based AI

No browser-based AI features are enabled in any part of this application. The published HTML reports are static files with no AI-powered components.

### Keeping this section current

Per the [AGENTS.md](./AGENTS.md) instructions, any AI agent that contributes to this project is required to update this section with its name, version (if known), and the nature of its contribution.

## Disability icons and accessibility impact

Each accessibility finding is annotated with icons representing the
[Section 508 Functional Performance Criteria (FPC)](https://www.section508.gov/develop/mapping-wcag-to-fpc/)
categories affected. These icons identify which disability groups are impacted by a given
accessibility barrier. Where page-load data is available, each icon also shows an estimated
number of people potentially excluded.

The prevalence figures below are drawn from the
[U.S. Census Bureau American Community Survey (ACS) 2022 1-Year Estimates, Table B18101](https://www.census.gov/topics/health/disability.html)
and supplemental federal sources (CDC, NIDCD, AFB, NIH/NEI).
U.S. resident population base: ~335.9 million (2022 estimate). Data is reviewed annually.

| FPC Code | Disability Group | Description | U.S. Prevalence | ~U.S. Population | Source |
|----------|-----------------|-------------|-----------------|-----------------|--------|
| WV | Without Vision | People who are blind or have no functional vision | 1.0% | ~3.4 million | American Foundation for the Blind (AFB): Americans with severe visual impairment or blindness |
| LV | Limited Vision | People with low vision who need magnification or high contrast | 2.4% | ~8.1 million | American Community Survey (ACS) 2022: vision difficulty (all severity levels) |
| WPC | Without Perception of Color | People who cannot distinguish certain colors (color vision deficiency) | 4.3% | ~14.5 million | NIH/NEI: ~8% of males and ~0.5% of females have color vision deficiency |
| WH | Without Hearing | People who are deaf and cannot hear audio content | 0.3% | ~1.1 million | NIDCD: ~1.1 million Americans with functional deafness |
| LH | Limited Hearing | People with hearing loss who may struggle with audio without accommodations | 3.5% | ~11.9 million | ACS 2022: hearing difficulty (all severity levels) |
| WS | Without Speech | People who cannot use speech or voice-based input effectively | 0.5% | ~1.7 million | NIDCD: severe non-verbal or speech-absent population |
| LM | Limited Manipulation | People with limited hand, finger, or fine motor dexterity | 2.2% | ~7.6 million | ACS 2022: self-care difficulty (fine-motor/dexterity proxy) |
| LRS | Limited Reach and Strength | People with limited reach, strength, or stamina | 5.8% | ~19.6 million | ACS 2022: ambulatory difficulty |
| LLCLA | Limited Language, Cognitive, and Learning Abilities | People with cognitive, learning, or language differences | 4.7% | ~15.9 million | ACS 2022: cognitive difficulty |

> **Note:** These rates are population-level estimates applied to web traffic counts. The resulting
> "excluded users" figures are rough estimates intended to highlight the scale of accessibility
> barriers, not precise measurements.

**Supplemental sources:**
- [CDC National Center on Birth Defects and Developmental Disabilities](https://www.cdc.gov/ncbddd/disabilityandhealth/features/disability-prevalence-rural-urban.html)
- [National Institute on Deafness and Other Communication Disorders (NIDCD)](https://www.nidcd.nih.gov/health/statistics/quick-statistics-hearing)
- [American Foundation for the Blind (AFB) statistical snapshots](https://www.afb.org/research-and-initiatives/statistics)
- [National Eye Institute / NIH color vision deficiency estimates](https://www.nei.nih.gov/learn-about-eye-health/eye-conditions-and-diseases/color-blindness)
