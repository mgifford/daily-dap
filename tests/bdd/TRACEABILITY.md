# BDD traceability matrix

This matrix maps stable behavior IDs to curated Gherkin scenarios and upstream feature references.

| Requirement ID | Domain | Feature file | Scenario summary | FEATURES.md reference |
|---|---|---|---|---|
| REQ-PUBLISH-001 | Publishing | `tests/bdd/features/publishing/daily-report.feature` | Exclude all-zero history rows | Section 11.1 Daily Report Page |
| REQ-PUBLISH-002 | Publishing | `tests/bdd/features/publishing/daily-report.feature` | Sort history newest to oldest | Section 11.1 Daily Report Page |
| REQ-PUBLISH-003 | Publishing | `tests/bdd/features/publishing/daily-report.feature` | Score cells reflect scan status | Section 11.1 Daily Report Page |
| REQ-PUBLISH-004 | Publishing | `tests/bdd/features/publishing/daily-report.feature` | Playwright acceptance boundary checks | Section 11.1 Daily Report Page |
| REQ-INGEST-001 | Ingest | `tests/bdd/features/ingest/dap-ingest.feature` | Local source-file ingest mode | Section 3 Data Ingestion |
| REQ-INGEST-002 | Ingest | `tests/bdd/features/ingest/dap-ingest.feature` | Traffic window mode behavior | Section 7 CLI options |
| REQ-SCAN-001 | Scanning | `tests/bdd/features/scanning/scan-execution.feature` | Successful scan normalization | Section 4 Scanners |
| REQ-SCAN-002 | Scanning | `tests/bdd/features/scanning/scan-execution.feature` | Failed scan reason propagation | Section 4 Scanners |
| REQ-AGG-001 | Aggregation | `tests/bdd/features/aggregation/impact-metrics.feature` | Accessibility impact summary behavior | Section 5 Aggregation and metrics |
| REQ-AGG-002 | Aggregation | `tests/bdd/features/aggregation/impact-metrics.feature` | Performance and slow-risk output behavior | Section 5 Aggregation and metrics |

## Ownership

Ownership conventions are documented in:

- `tests/bdd/OWNERS.md`
