FOR IMMEDIATE RELEASE

# U.S. Government Website Accessibility Report: April 18, 2026

*Washington, D.C. -- April 18, 2026* -- A daily scan of 99 of the most-visited U.S. government websites found 198 accessibility barriers across 99 URLs today. The most common issues include Document Structure Navigation, Digital Motor Access, and Primary Content Identification.

These barriers prevent Americans with disabilities from independently accessing essential government services. This is a single daily snapshot of the most popular ~99 pages in U.S. federal government web properties, as measured by the Digital Analytics Program (DAP).

## Americans Being Left Out

Based on page traffic data and U.S. Census disability prevalence estimates (ACS 2022), today's accessibility barriers are estimated to affect the following groups of Americans:

| Disability Group | Affected Page Loads | Estimated People Affected |
|-----------------|---------------------|--------------------------|
| Limited Reach and Strength | 6,840,842 | ~396,769 |
| Limited Manipulation | 11,147,894 | ~245,254 |
| Without Perception of Color | 4,437,969 | ~190,833 |
| Limited Vision | 5,753,990 | ~138,096 |
| Without Vision | 11,351,054 | ~113,511 |
| Without Hearing | 11,351,054 | ~34,053 |
| Limited Language, Cognitive, and Learning Abilities | 160,520 | ~7,544 |

*Total page loads across all scanned URLs today: 17,022,412*

*Estimates use disability prevalence rates from the U.S. Census Bureau American Community Survey (ACS) 2022, supplemented by CDC, NIDCD, AFB, and NIH/NEI data. These are rough estimates intended to illustrate the scale of accessibility barriers, not precise measurements.*

## Top Accessibility Barriers

The following accessibility issues were most frequently found across today's scanned government websites. Each issue prevents specific groups of Americans from independently accessing government services.

### 1. `heading-order`: Document Structure Navigation

*Found on 25 government websites today*

Screen reader users navigate complex government websites primarily through heading structure, using headings as a table of contents to jump between sections. Skipped heading levels break the logical document outline, causing confusion about the hierarchy of information and forcing users to re-read sections to understand the relationship between topics, adding significant time and effort to information-gathering tasks.

**Affected groups:**

- People who are blind using screen readers
- People who are deaf and rely on visual-to-text tools
- People with motor disabilities using keyboard navigation

### 2. `target-size`: Digital Motor Access

*Found on 22 government websites today*

Small touch targets act as a digital gatekeeper, excluding individuals with tremors, arthritis, or limited dexterity from accessing essential services independently. These technical failures transform a routine interaction into a source of failure, stripping away the autonomy of citizens who require a frictionless, accessible interface to participate in digital life. The approximately 58 million Americans with ambulatory or self-care disabilities are disproportionately impacted by inadequate touch target sizing on government mobile websites.

**Affected groups:**

- People with Parkinson's disease, arthritis, or hand tremors
- Older adults with reduced fine motor control
- People with motor disabilities using alternative pointing devices
- People in situational impairment contexts (e.g., commuting, holding a child)

### 3. `landmark-one-main`: Primary Content Identification

*Found on 22 government websites today*

Without a main landmark, screen reader users lose their most efficient way to skip to the primary content of a government page. Every page visit requires tabbing through the entire navigation structure to reach the actual content, a significant time and effort burden that accumulates across repeated visits to government websites for citizens managing ongoing benefit cases or legal matters.

**Affected groups:**

- People who are blind using screen readers
- People who are deaf and rely on visual-to-text tools
- People with motor disabilities using keyboard navigation

### 4. `color-contrast`: Visual Information Access

*Found on 18 government websites today*

Low contrast text is one of the most pervasive barriers on government websites, rendering critical information invisible to the approximately 26 million Americans with low vision or color blindness. When agency announcements, form instructions, error messages, or legal notices are displayed in insufficient contrast, affected citizens are denied equal access to the information they need to exercise their rights and access public services.

**Affected groups:**

- People with low vision including age-related vision loss
- People who are color blind (approximately 8% of men, 0.5% of women)

### 5. `label-content-name-mismatch`: Voice Control Activation

*Found on 17 government websites today*

When the accessible name of an element does not match its visible text, voice control users cannot activate it using the words they see on screen. Saying "click Submit" to a button whose visual label is "Submit" but whose accessible name is "submitbtn" results in no action. This mismatch silently breaks voice control for citizens with motor disabilities who depend on this input method to interact with government websites.

**Affected groups:**

- People who are blind using screen readers
- People with low vision relying on screen magnifiers
- People who are deaf using keyboard navigation
- People with motor disabilities using voice control software

## Accessibility Scores

Aggregate Lighthouse scores across 99 scanned U.S. government websites today:

| Metric | Score |
|--------|-------|
| Accessibility | 93.54 |
| Performance | 54.03 |
| Best Practices | 85.51 |
| SEO | 90.93 |

## About This Report

This report captures a daily snapshot of the most-visited U.S. government web pages as measured by the Digital Analytics Program (DAP). Scans use Lighthouse (Google's automated web quality tool, which includes axe-core for accessibility testing). Reports are published automatically each day.

- [View full interactive report](https://mgifford.github.io/daily-dap/docs/reports/daily/2026-04-18/index.html)
- [Download accessibility findings (JSON)](https://mgifford.github.io/daily-dap/docs/reports/daily/2026-04-18/axe-findings.json)
- [Download accessibility findings (CSV)](https://mgifford.github.io/daily-dap/docs/reports/daily/2026-04-18/axe-findings.csv)

---

*Generated by [Daily DAP](https://github.com/mgifford/daily-dap) | Source: Digital Analytics Program | Methodology: Lighthouse + axe-core | Date: 2026-04-18*
