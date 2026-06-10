FOR IMMEDIATE RELEASE

# U.S. Government Website Accessibility Report: June 10, 2026

*Washington, D.C. -- June 10, 2026* -- A daily scan of 80 of the most-visited U.S. government websites found 168 accessibility barriers across 99 URLs today. The most common issues include Digital Motor Access, Document Structure Navigation, and Voice Control Activation.

These barriers prevent Americans with disabilities from independently accessing essential government services. This is a single daily snapshot of the most popular ~99 pages in U.S. federal government web properties, as measured by the Digital Analytics Program (DAP).

## Americans Being Left Out

Based on page traffic data and U.S. Census disability prevalence estimates (ACS 2022), today's accessibility barriers are estimated to affect the following groups of Americans:

| Disability Group | Affected Page Loads | Estimated People Affected |
|-----------------|---------------------|--------------------------|
| Limited Reach and Strength | 17,338,540 | ~1,005,635 |
| Limited Manipulation | 25,658,224 | ~590,139 |
| Without Perception of Color | 6,465,573 | ~278,020 |
| Without Vision | 25,652,422 | ~256,524 |
| Limited Vision | 11,086,208 | ~254,983 |
| Limited Language, Cognitive, and Learning Abilities | 3,353,640 | ~164,328 |
| Without Hearing | 25,652,422 | ~76,957 |

*Total page loads across all scanned URLs today: 44,874,078*

*Estimates use disability prevalence rates from the U.S. Census Bureau American Community Survey (ACS) 2022, supplemented by CDC, NIDCD, AFB, and NIH/NEI data. These are rough estimates intended to illustrate the scale of accessibility barriers, not precise measurements.*

## Top Accessibility Barriers

The following accessibility issues were most frequently found across today's scanned government websites. Each issue prevents specific groups of Americans from independently accessing government services.

### 1. `target-size`: Digital Motor Access

*Found on 23 government websites today*

Small touch targets act as a digital gatekeeper, excluding individuals with tremors, arthritis, or limited dexterity from accessing essential services independently. These technical failures transform a routine interaction into a source of failure, stripping away the autonomy of citizens who require a frictionless, accessible interface to participate in digital life. The approximately 58 million Americans with ambulatory or self-care disabilities are disproportionately impacted by inadequate touch target sizing on government mobile websites.

**Affected groups:**

- People with Parkinson's disease, arthritis, or hand tremors
- Older adults with reduced fine motor control
- People with motor disabilities using alternative pointing devices
- People in situational impairment contexts (e.g., commuting, holding a child)

### 2. `heading-order`: Document Structure Navigation

*Found on 16 government websites today*

Screen reader users navigate complex government websites primarily through heading structure, using headings as a table of contents to jump between sections. Skipped heading levels break the logical document outline, causing confusion about the hierarchy of information and forcing users to re-read sections to understand the relationship between topics, adding significant time and effort to information-gathering tasks.

**Affected groups:**

- People who are blind using screen readers
- People who are deaf and rely on visual-to-text tools
- People with motor disabilities using keyboard navigation

### 3. `label-content-name-mismatch`: Voice Control Activation

*Found on 15 government websites today*

When the accessible name of an element does not match its visible text, voice control users cannot activate it using the words they see on screen. Saying "click Submit" to a button whose visual label is "Submit" but whose accessible name is "submitbtn" results in no action. This mismatch silently breaks voice control for citizens with motor disabilities who depend on this input method to interact with government websites.

**Affected groups:**

- People who are blind using screen readers
- People with low vision relying on screen magnifiers
- People who are deaf using keyboard navigation
- People with motor disabilities using voice control software

### 4. `color-contrast`: Visual Information Access

*Found on 14 government websites today*

Low contrast text is one of the most pervasive barriers on government websites, rendering critical information invisible to the approximately 26 million Americans with low vision or color blindness. When agency announcements, form instructions, error messages, or legal notices are displayed in insufficient contrast, affected citizens are denied equal access to the information they need to exercise their rights and access public services.

**Affected groups:**

- People with low vision including age-related vision loss
- People who are color blind (approximately 8% of men, 0.5% of women)

### 5. `link-name`: Link Purpose Clarity

*Found on 12 government websites today*

Links without accessible names are completely useless to screen reader users who navigate government pages by jumping between links. An unnamed link could lead anywhere, and activating it unknowingly could trigger downloads, open unexpected pages, or initiate unintended processes. On government websites, unnamed links undermine the informed consent principle by preventing citizens from knowing where a link will take them.

**Affected groups:**

- People who are blind using screen readers
- People who are deaf and rely on visual-to-text tools
- People with motor disabilities using keyboard navigation

## Accessibility Scores

Aggregate Lighthouse scores across 80 scanned U.S. government websites today:

| Metric | Score |
|--------|-------|
| Accessibility | 92.05 |
| Performance | 55 |
| Best Practices | 84.53 |
| SEO | 88.89 |

## About This Report

This report captures a daily snapshot of the most-visited U.S. government web pages as measured by the Digital Analytics Program (DAP). Scans use Lighthouse (Google's automated web quality tool, which includes axe-core for accessibility testing). Reports are published automatically each day.

- [View full interactive report](https://mgifford.github.io/daily-dap/docs/reports/daily/2026-06-10/index.html)
- [Download accessibility findings (JSON)](https://mgifford.github.io/daily-dap/docs/reports/daily/2026-06-10/axe-findings.json)
- [Download accessibility findings (CSV)](https://mgifford.github.io/daily-dap/docs/reports/daily/2026-06-10/axe-findings.csv)

---

*Generated by [Daily DAP](https://github.com/mgifford/daily-dap) | Source: Digital Analytics Program | Methodology: Lighthouse + axe-core | Date: 2026-06-10*
