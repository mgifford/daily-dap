# Mission Retrospective Template

Copy this template to `kitty-specs/<mission>/retrospective.md` when a mission completes,
and fill in every field. Retrospectives are part of the project's institutional memory:
future missions and agents read them to avoid repeating mistakes.

Keep entries factual and specific. Reference files by project-relative path.

```yaml
mission: kitty-specs/<number>-<slug>/
completed: YYYY-MM-DD
wins:
  - What went well and should be repeated.
surprises:
  - What was unexpected (good or bad) and what we learned from it.
mistakes:
  - What went wrong, why, and how it was (or should be) corrected.
governance_changes:
  - Constitution amendments, new or changed review gates, or process changes
    that resulted from this mission. Use "none" if there were none.
future_work:
  - Follow-up items that were identified but intentionally deferred,
    with enough context for someone else to pick them up.
```

## Notes

- Write retrospectives promptly, while context is fresh.
- If a mistake revealed a gap in the review gates or the constitution, propose the
  amendment (see `.kittify/memory/constitution.md`, Amendments) and record it under
  `governance_changes`.
- Retrospectives are reviewed like any other artifact: they go through a pull request.
