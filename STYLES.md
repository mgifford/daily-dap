# STYLES.md: Design and content standards

This file defines how standards are written, designed, and published in this project.
It governs two distinct surfaces and is the authoritative reference for both humans
and AI coding agents contributing to this repository.

This project uses [CivicActions](https://civicactions.com/) brand identity and adheres
to the [CivicActions Style Guide](https://civicactions-style-guide.readthedocs.io/en/latest/).
Designers should refer to that guide as the canonical source for brand assets, full color
palettes, typography specimens, and Figma resources.

---

## Scope: documentation files vs. the website

This project has two surfaces that share the same standards:

| Surface | Files | Audience |
| :--- | :--- | :--- |
| **GitHub Pages site** | `index.html`, `docs/reports/`, pages with front matter | Public visitors browsing the report site |
| **Repository documentation** | `README.md`, `AGENTS.md`, `STYLES.md`, `ACCESSIBILITY.md`, `FEATURES.md` | Contributors, adopters, and AI agents reading files directly on GitHub |

**What applies to both surfaces:**
- Section 2 - Content and voice standards (plain language, active voice, sentence-case headings, American English, abbreviations, content structure)
- Section 4 - Accessibility and semantic logic (heading hierarchy, alt text, link text)
- Section 5 - AI agent instructions
- Section 6 - Content governance

**What applies to the website only:**
- Section 3 - Design foundations (color tokens, typography, breakpoints, page layout)

Even though documentation files are rendered as plain Markdown rather than styled HTML,
they share the same voice, tone, and heading conventions as the site. This keeps the
project a unified whole for every reader, regardless of which surface they encounter first.

---

## 1. Core philosophy

We design for the reader, not the institution. The goal is to reduce cognitive load
through consistency, clarity, and radical accessibility.

CivicActions advances the greater good through technology built for humans. Daily DAP
reflects these core brand values:

- **Confidence**: we have the experience and drive to solve hard problems.
- **Curiosity**: we are agile, innovative, and inquisitive.
- **Humanity**: we put people first and share our work openly.

Design and writing principles derived from those values:

1. **Reader-first.** Start with the reader's need, not the organization's structure.
2. **Plain language.** If a 12-year-old cannot understand it, it is a barrier.
3. **Inclusive by default.** See [ACCESSIBILITY.md](./ACCESSIBILITY.md) for all interaction and visual standards.
4. **Consistency is trust.** AI agents and humans must use the same tokens, patterns, and vocabulary.
5. **Radically open.** Work transparently; share methods, data, and findings openly.

---

## 2. Content and voice standards

Derived from UK GDS and Digital.gov plain language standards, and aligned with the
[CivicActions Style Guide](https://civicactions-style-guide.readthedocs.io/en/latest/).

### 2.1 Voice and tone

We use an **authoritative peer** tone: professional and knowledgeable, but accessible
and supportive. This reflects CivicActions' brand personality: modern, clean,
professional, friendly, and optimistic.

| Context | Tone | Strategy |
| :--- | :--- | :--- |
| **Onboarding** | Encouraging | Focus on the benefit to the reader |
| **Technical / legal** | Precise | Be unambiguous; explain "why" if a rule is complex |
| **Error states** | Calm / helpful | Do not blame the reader; provide a clear path forward |
| **Data / impact** | Confident and grounded | Let numbers speak; contextualize without overstating |

### 2.2 Plain language and word choice

AI agents must prioritize these substitutions:

| Avoid | Use instead |
| :--- | :--- |
| Utilize / leverage | Use |
| Facilitate / implement | Help / carry out |
| At this point in time | Now |
| In order to | To |
| Notwithstanding | Despite / even though |
| Requirements | Rules / what you need |

### 2.3 Grammar and mechanics

- **Active voice:** "The scanner checks the link" - not "The link is checked by the scanner."
- **Sentence case:** Use sentence case for all headings and buttons. "Save and continue" - not "Save and Continue."
- **Lists:** Use bullets for unordered items. Use numbered lists only for sequential steps.
- **Oxford comma:** Always use the serial comma in lists of three or more.

### 2.4 Spelling convention

This project uses **American English** as its default spelling standard.

| Variant | Example spellings | When to use |
| :--- | :--- | :--- |
| **American English** (default) | color, center, optimize, behavior | All documentation in this project |

> **AI agents:** Always apply American English spelling rules throughout all documents.

### 2.5 Abbreviations, numbers, and dates

#### Abbreviations

- Spell out an abbreviation on first use, then use the short form: "Web Content Accessibility
  Guidelines (WCAG)."
- Do not use periods in acronyms: "HTML," "CSS," "AI" - not "H.T.M.L."
- Avoid jargon-only abbreviations without explanation unless writing for a specialist audience.

#### Numbers

| Context | Rule | Example |
| :--- | :--- | :--- |
| **In body text** | Spell out one through nine; use numerals for 10 and above | "three pillars," "12 tokens" |
| **Starts a sentence** | Always spell out | "Twelve steps are required." |
| **Percentages** | Use numerals and the % symbol | "4.5% contrast ratio" |
| **Versions and technical values** | Always use numerals | "WCAG 2.2," "font-size: 1rem" |

#### Dates

- Use **ISO 8601** for machine-readable dates: `2025-06-01`.
- Use **spelled-out months** for human-readable dates: "June 1, 2025."
- Do not use all-numeric dates that could be ambiguous across locales (01/06/2025).

### 2.6 Attribution and citation

When quoting, adapting, or referencing external work in documentation:

- **Quote directly** only when the original wording matters and cannot be improved.
  Block-quote passages over three lines.
- **Paraphrase** when the idea is what matters. Paraphrasing does not remove the need
  to credit the source.
- **Credit the source** inline or in a references section.
- **Link to the source** rather than reproducing large portions of external content.
- **Do not reproduce** entire copyrighted works, style guides, or specifications.
  Reference them and link to the canonical source.

> **AI agents:** Do not reproduce large passages from external style guides or
> specifications verbatim. Summarize, paraphrase, and link to the canonical source.

### 2.7 Content structure and document types

Different document types follow different patterns. Use the appropriate structure
rather than treating all Markdown files the same.

| Document type | Purpose | Structure pattern |
| :--- | :--- | :--- |
| **Reference** (STYLES.md, ACCESSIBILITY.md) | Authoritative rules; consulted, not read cover-to-cover | Numbered sections, tables, bullet rules |
| **Guide or how-to** (examples/, README.md) | Step-by-step walkthrough for a specific audience | Numbered steps, "you" voice, outcome-focused |
| **Feature catalog** (FEATURES.md) | Comprehensive technical inventory | Categorized sections, file paths, option tables |

Rules that apply to all document types:

- Use heading levels in order (`#` then `##` then `###`). Do not skip levels.
- Open each document with a one-sentence purpose statement.
- Keep paragraphs short: three to five sentences is a good maximum.
- Prefer short sentences over long, complex ones.

---

## 3. Design foundations (site surface only)

These rules apply to generated HTML reports (`docs/reports/`), `index.html`, and any
page with front matter. They do not govern plain Markdown documentation files.

### 3.0 Brand profile

**Active brand:** CivicActions

- **Brand site:** [civicactions.com](https://civicactions.com/)
- **Full style guide:** [civicactions-style-guide.readthedocs.io](https://civicactions-style-guide.readthedocs.io/en/latest/)
- **Figma library:** Available to CivicActions team members via the [CivicActions Brand Library in Figma](https://www.figma.com/file/Otn3wXzeK52f7gld41ZWIX/CivicActions-Brand-Library)

**Brand personality:** Modern, clean, professional, friendly, optimistic.

**Brand values expressed in design:**
- Use clear hierarchy and ample white space (clean, professional).
- Prefer the primary red accent for calls to action and key data highlights (confident).
- Use accessible color contrast and generous touch targets (humanity, inclusive).
- Keep layouts simple and scannable (friendly, optimistic).

Designers should consult [docs/brand/brand-overview.md in the CivicActions style guide
repository](https://github.com/civicactions/style-guide/blob/main/docs/introduction/brand-overview.md)
before proposing visual changes to this project.

### 3.1 Design tokens

The canonical values live in the inline styles within `src/publish/render-pages.js`.
This table documents the design intent aligned with the CivicActions brand palette.

For the full CivicActions palette including CMYK, RGB, and USWDS equivalents, see the
[Colors page in the CivicActions Style Guide](https://civicactions-style-guide.readthedocs.io/en/latest/brand/colors/).

#### Brand colors

| Token | Hex | Role |
| :--- | :--- | :--- |
| `--ca-red` | `#D83933` | Primary brand red; calls to action, key highlights |
| `--ca-blue-dark` | `#162E51` | Primary brand blue; headers, strong text |
| `--ca-blue-light` | `#73B3E7` | Light blue; supporting accents |
| `--ca-gold` | `#FA9441` | Accent warm gold; warnings, secondary highlights |
| `--ca-gold-light` | `#FFBC78` | Accent warm light gold; subtle highlights |
| `--ca-red-secondary` | `#8B0A03` | Secondary red; hover states on red elements |
| `--ca-blue-secondary` | `#1A4480` | Secondary blue; links, interactive elements |

#### System tokens (light mode)

| Token | Value | Requirement |
| :--- | :--- | :--- |
| `--color-bg` | `#ffffff` | Base page background |
| `--color-bg-soft` | `#f0f0f0` | Section backgrounds, subtle areas (CA Gray-05) |
| `--color-text` | `#171717` | 4.5:1 contrast on `--color-bg` required (CA Gray-90) |
| `--color-muted` | `#454545` | Supporting copy; 3:1 minimum on `--color-bg` (CA Gray-70) |
| `--color-line` | `#e6e6e6` | Cards, section separators (CA Gray-10) |
| `--color-accent` | `#D83933` | Primary CTA and focus ring color (CA Primary Red) |
| `--color-link` | `#1A4480` | Link text (CA Secondary Blue) |

#### System tokens (dark mode)

Dark mode swaps use `@media (prefers-color-scheme: dark)` with a CSS custom property
override pattern. See `src/publish/render-pages.js` for the implemented values.

### 3.2 Typography

The CivicActions brand typography is documented in the
[CivicActions Brand Library in Figma](https://www.figma.com/file/Otn3wXzeK52f7gld41ZWIX/CivicActions-Brand-Library).
For this project's HTML reports, apply these implementation rules:

- **Font stack:** `'Public Sans', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`
  (Public Sans is the USWDS default and aligns with government digital service conventions.)
- **Font scaling:** Use `rem` units. Never use `px` for font sizes.
- **Line length:** 45-75 characters per line (`max-width: 760px` for prose blocks).
- **Line height:** Minimum `1.6` for body text.
- **Text alignment:** Use left-aligned text for body content. Avoid `text-align: justify`.
- **Capitalization:** Use CSS `text-transform` for decorative uppercase styling. Do not write uppercase text directly in HTML source.

### 3.3 Responsive design (mobile-first)

Write base CSS for the smallest screen first, then enhance with `min-width` queries.

| Layer | Breakpoint | Intent |
| :--- | :--- | :--- |
| **Mobile** | `0`-`599px` (base, no query) | Single-column, touch targets >= 44x44 px |
| **Tablet** | `min-width: 600px` | Two-column layouts where content benefits |
| **Desktop** | `min-width: 900px` | Multi-column grids, wider prose, side panels |

- **Never block zoom.** The viewport meta tag must not include `maximum-scale=1` or `user-scalable=no`. Users must be able to scale the page freely.

### 3.4 User-preference media queries

| Query | Status | Implementation |
| :--- | :--- | :--- |
| `prefers-color-scheme` | Required | Dark/light token swap via CSS custom properties |
| `prefers-reduced-motion` | Required | Remove or reduce transitions and animations |
| `prefers-contrast` | Planned | Not yet implemented |
| `forced-colors` | Planned | Not yet implemented |
| `print` | Recommended | Hide navigation and decorative elements; render body text at >= 12pt; append `href` values on links |

---

## 4. Accessibility and semantic logic

These rules apply to **both surfaces**. This project exists to benchmark government
website accessibility; our own outputs must meet or exceed the same standards we measure.

- Use heading levels in order: `h1` then `h2` then `h3`. Do not skip levels.
- Write descriptive link text. "Read more about plain language" - not "click here."
- Every image needs meaningful alt text. Decorative images use `alt=""`.
- Use `aria-label` on landmark elements when the role is ambiguous.
- Minimum color contrast: 4.5:1 for body text, 3:1 for large text and UI components.
- Do not convey information by color alone. Always pair color with a secondary indicator: an icon, label, pattern, or text.
- Ensure touch and click targets are at least 44x44 pixels for primary interactive elements.
- Use underlines only for links, not for decorative or non-link text.
- Always use `escapeHtml()` when rendering user-controlled or externally sourced data in HTML.
- Provide a "skip to main content" skip link at the start of each page so keyboard users can bypass repeated navigation.

See [ACCESSIBILITY.md](./ACCESSIBILITY.md) for the full accessibility commitment and conformance target (WCAG 2.2 AA).

See [CivicActions accessibility guidance](https://civicactions.com/accessibility-statement) for
the organizational accessibility statement.

---

## 5. AI agent instructions

These rules apply to both surfaces. Agents editing documentation and agents
generating site content must follow all of them.

- Read [AGENTS.md](./AGENTS.md) before making any change to this repository.
- Identify which surface is being edited (site or documentation) and apply the correct rule set.
- Never override [ACCESSIBILITY.md](./ACCESSIBILITY.md) constraints.
- Use American English throughout.
- Keep changes scoped to the minimum necessary to fulfill the user's request.
- Verify all cross-file references resolve before committing.
- When rendering HTML, always use `escapeHtml()` for any user-controlled or external data.
- Use UTF-8 encoding only. Do not use smart quotes, em dashes, or Windows-1252 characters.
- Use absolute or project-relative paths (e.g., `src/scanners/lighthouse-runner.js`), never bare filenames.
- Update the `## AI Disclosure` section in `README.md` with your LLM name, version, and contribution.

---

## 6. Content governance

These rules describe how this style guide itself is maintained and updated.

- **Ownership:** The project maintainer is responsible for keeping these standards
  current. Contributors may propose changes via pull request.
- **Designer approval:** Visual changes to color tokens, typography, or layout must
  be reviewed against the [CivicActions Style Guide](https://civicactions-style-guide.readthedocs.io/en/latest/)
  before merging. Tag a CivicActions designer for review on any such PR.
- **Versioning:** Changes to standards that affect existing content should be noted
  in commit messages.
- **Conflict resolution:** When two rules conflict, the more specific rule takes
  precedence. When this file conflicts with ACCESSIBILITY.md, ACCESSIBILITY.md wins.
  When this file conflicts with the CivicActions Style Guide on brand matters,
  the CivicActions Style Guide wins.
- **Review cycle:** Standards should be reviewed against the CivicActions Style Guide
  at least once per year or when a major brand update occurs.
- **Deprecation:** Remove outdated rules rather than leaving contradictions.

> **AI agents:** Do not silently override or quietly contradict rules in this file.
> If a requested change would conflict with an existing rule, surface the conflict
> and ask for clarification before proceeding.

---

## 7. References

- [CivicActions Style Guide](https://civicactions-style-guide.readthedocs.io/en/latest/)
- [CivicActions Style Guide repository](https://github.com/civicactions/style-guide)
- [CivicActions brand site](https://civicactions.com/)
- [CivicActions accessibility statement](https://civicactions.com/accessibility-statement)
- [Plain Language Guidelines - Digital.gov](https://www.plainlanguage.gov/guidelines/)
- [GOV.UK Content Design Guide](https://www.gov.uk/guidance/content-design/writing-for-gov-uk)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [U.S. Web Design System (USWDS)](https://designsystem.digital.gov/)
- [STYLES.md reference template](https://github.com/mgifford/STYLES.md)
- [ACCESSIBILITY.md](./ACCESSIBILITY.md)
- [AGENTS.md](./AGENTS.md)
- [FEATURES.md](./FEATURES.md)
