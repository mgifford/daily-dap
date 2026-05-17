@publishing @daily-report
Feature: Daily report publishing behavior
  # Source references:
  # - /home/runner/work/daily-dap/daily-dap/FEATURES.md (Section 11.1, Daily Report Page)
  # - /home/runner/work/daily-dap/daily-dap/FEATURES.md (Section 6, Publishing and report generation)

  Rule: History and score content is trustworthy and readable

    @REQ-PUBLISH-001 @tier-pr
    Scenario: Zero-score history entries are excluded from historical display
      Given a report includes daily score history with all-zero and non-zero entries
      When the daily report page is generated
      Then all-zero history rows are not shown in the history table
      And non-zero history rows remain visible

    @REQ-PUBLISH-002 @tier-pr
    Scenario: History table shows newest day first
      Given a report includes multiple days of non-zero history scores
      When the daily report page is generated
      Then the history table orders rows from most recent date to oldest date

  Rule: Top URL score presentation communicates scan outcomes

    @REQ-PUBLISH-003 @tier-pr
    Scenario Outline: Top URL score cells reflect scan status
      Given a top URL entry with scan status "<status>"
      When the daily report page is generated
      Then the Lighthouse score columns display "<score_display>"

      Examples:
        | status  | score_display |
        | success | numeric       |
        | failed  | placeholder   |

  Rule: Acceptance boundary checks are validated in browser automation

    @REQ-PUBLISH-004 @tier-nightly @playwright
    Scenario: Accessibility and semantic structure of rendered page pass acceptance checks
      Given a generated daily report page for a representative fixture report
      When the page is validated at the rendering boundary
      Then expected semantic sections and table headings are present
      And accessibility requirements for the rendered output are met
