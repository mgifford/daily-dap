@scan
Feature: Scan execution behavior
  # Source references:
  # - FEATURES.md (Section 4, Scanners)
  # - FEATURES.md (Section 7, Run CLI and rate-limiting controls)

  Rule: Scan outcomes are visible and classified for downstream reporting

    @REQ-SCAN-001 @tier-pr
    Scenario: Successful scan produces normalized result fields
      Given a URL scan completes successfully
      When scan results are normalized
      Then the output includes a successful scan status
      And normalized fields required by report generation are present

    @REQ-SCAN-002 @tier-pr
    Scenario: Failed scan preserves failure reason for operators
      Given a URL scan fails during execution
      When scan results are normalized
      Then the output marks the scan status as failed
      And a failure reason is available for diagnostics and reporting
