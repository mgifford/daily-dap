@ingest
Feature: DAP ingestion behavior
  # Source references:
  # - FEATURES.md (Section 3, Data Ingestion)
  # - FEATURES.md (Section 7, CLI options for source data and traffic window)

  Rule: Input source and date windows are explicit and predictable

    @REQ-INGEST-001 @tier-pr
    Scenario: Local source file can be used to run without remote dependency
      Given an operator provides a valid local source file
      When the ingestion stage runs
      Then URLs and traffic values are loaded from that file
      And ingestion diagnostics identify the selected source mode

    @REQ-INGEST-002 @tier-nightly
    Scenario Outline: Traffic window mode is reflected in ingest behavior
      Given traffic window mode "<window_mode>" is configured
      When the ingestion stage runs for a dated dataset
      Then the resulting ingest output records "<window_mode>" as the active traffic mode

      Examples:
        | window_mode |
        | daily       |
        | rolling_7d  |
        | rolling_30d |
