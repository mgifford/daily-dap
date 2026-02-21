# Research Notes: Daily DAP Quality Benchmarking

## Decision 1: URL and traffic ingest source

- **Decision**: Ingest top URLs and daily page-load counts from DAP-supported public data endpoints and normalize into a single daily input snapshot.
- **Rationale**: Enables traffic-weighted scoring and stable reproducible daily comparisons.
- **Alternatives considered**:
  - Pull URL list without load counts (rejected: no impact weighting)
  - Manual URL lists (rejected: diverges from DAP reality)

## Decision 2: Accessibility finding severity model

- **Decision**: Use weighted severity model for impacted-user estimation: critical=1.0, serious=0.6, moderate=0.3, minor=0.1.
- **Rationale**: More realistic than binary counting; aligns with prioritization goals.
- **Alternatives considered**:
  - Binary (any issue) model (rejected: overstates low-severity findings)
  - Critical-only model (rejected: understates broad accessibility barriers)

## Decision 3: Traffic weighting window

- **Decision**: Default to previous calendar day page-load counts; expose rolling 7-day and 30-day as configurable options.
- **Rationale**: Preserves recency while allowing smoothing modes.
- **Alternatives considered**:
  - Fixed 30-day average only (rejected: less responsive to daily changes)

## Decision 4: Slow-risk performance criterion

- **Decision**: Mark constrained-network slow-risk when Core Web Vitals status is poor.
- **Rationale**: User-centered signal for mobile/rural load quality without coupling to a single score threshold.
- **Alternatives considered**:
  - Lighthouse score thresholds only (rejected: less diagnostic for field-like behavior)

## Decision 5: Publishing and archival strategy

- **Decision**: Persist each run in both GitHub Actions artifacts and committed snapshots consumed by GitHub Pages.
- **Rationale**: Combines immutable run archives with public visibility.
- **Alternatives considered**:
  - Artifacts only (rejected: poor direct Pages integration)
  - Repo snapshots only (rejected: reduced run-level CI traceability)

## Open follow-ups for implementation

- Determine exact ingest endpoint pagination/limits for top 1000 coverage.
- Pin scanner versions and execution flags for longitudinal metric stability.
- Define report disclaimer language for prevalence-based impact estimates.
