@aggregation
Feature: Accessibility impact aggregation behavior
  # Source references:
  # - /home/runner/work/daily-dap/daily-dap/FEATURES.md (Section 5, Aggregation and metrics)
  # - /home/runner/work/daily-dap/daily-dap/FEATURES.md (Section 12, Accessibility compliance features)

  Rule: Impact estimates remain interpretable and stable across runs

    @REQ-AGG-001 @tier-pr
    Scenario: Aggregate impact includes weighted affected-share metrics
      Given normalized findings and traffic values for scanned URLs
      When aggregation computes accessibility impact
      Then the report includes affected share and impacted traffic estimates
      And impacted categories are represented in the aggregate output

    @REQ-AGG-002 @tier-nightly
    Scenario: Slow-risk and performance impact are preserved in daily report payload
      Given scan results include performance data for multiple URLs
      When report payload aggregation is completed
      Then the payload includes performance impact metrics
      And the payload includes slow-risk metrics for downstream rendering
