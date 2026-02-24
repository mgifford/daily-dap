# ACCESSIBILITY.md

> **Daily DAP's commitment to accessibility transparency and inclusive quality benchmarking.**

## Our Accessibility Mission

Daily DAP exists to benchmark the quality and accessibility of the most visited U.S. government websites. As a project focused on measuring and reporting accessibility, we are committed to ensuring our own tools, reports, and outputs are accessible and follow the same standards we measure.

**Core Principles:**
- Generate accessible HTML reports that meet WCAG 2.2 AA standards
- Provide transparency on government website accessibility through data
- Support accessibility advocates and agency teams with actionable metrics
- Ensure our tooling and documentation is accessible to all contributors

---

## Conformance Status

**Target Conformance Level**: WCAG 2.2 AA

**Current Status**: In Development
- HTML report generation includes proper semantic markup and escaping
- All reports include lang attributes, viewport meta tags, and proper HTML structure
- Reports use accessible table markup with proper headers

---

## Accessibility Features of This Project

### 1. Accessibility Scanning Infrastructure

This project integrates multiple accessibility scanning tools:

- **Lighthouse Accessibility Audits**: Automated WCAG checks on sampled government pages
- **ScanGov Integration**: Additional accessibility finding detection
- **Severity Classification**: Issues categorized as critical, serious, moderate, or minor
- **Impact Estimation**: Traffic-weighted accessibility impact calculations

**Key Files:**
- `src/scanners/lighthouse-runner.js` - Lighthouse integration
- `src/scanners/scangov-runner.js` - ScanGov scanning
- `src/aggregation/impact-estimation.js` - Accessibility impact metrics

### 2. Secure HTML Rendering

All user-controlled content in generated reports is properly escaped to prevent XSS vulnerabilities:

```javascript
function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
```

**Location**: `src/publish/render-pages.js`

### 3. Accessible Report Structure

Generated HTML reports follow accessibility best practices:

- **Semantic HTML**: Proper use of `<table>`, `<thead>`, `<tbody>`, `<th>`, `<td>`
- **Language Declaration**: All pages include `lang="en"` attribute
- **Viewport Meta Tag**: Responsive design support for mobile devices
- **Proper Charset**: UTF-8 encoding declared in all HTML documents
- **Link Attributes**: External links include `target="_blank"` with `rel="noreferrer"` for security

**Example Report Output**: `docs/reports/daily/YYYY-MM-DD/index.html`

---

## Testing and Validation

### Current Testing Practices

- **Unit Tests**: Comprehensive coverage of core logic functions
- **Contract Tests**: Schema validation for report payloads
- **Integration Tests**: End-to-end workflow validation

**Run tests**: `npm test`

### Accessibility Testing Tools Used

1. **Lighthouse**: Automated accessibility audits (included in scan process)
2. **Manual Validation**: HTML report structure review

---

## Known Gaps and Future Work

### Current Limitations

- [ ] No automated accessibility testing of generated HTML reports in CI
- [ ] Limited screen reader testing of report pages
- [ ] No automated checks for color contrast in report styling (when styling is added)

### Planned Improvements

- [ ] Add axe-core testing of generated HTML reports in CI pipeline
- [ ] Implement pre-commit hooks for accessibility checks
- [ ] Add keyboard navigation testing for interactive report features
- [ ] Screen reader compatibility testing with NVDA/JAWS

---

## Contributing with Accessibility in Mind

### For Developers

When working on this project:

1. **HTML Generation**: Always use `escapeHtml()` for dynamic content
2. **Semantic Markup**: Use proper HTML5 semantic elements
3. **ARIA**: Only add ARIA attributes when native HTML semantics are insufficient
4. **Testing**: Manually review generated HTML reports for accessibility
5. **Documentation**: Keep this file updated with new accessibility features

### Best Practices for This Codebase

#### HTML Rendering Security
- **Always** escape user-controlled or external data before rendering in HTML
- **Never** insert unescaped URLs, page titles, or scan results directly into HTML
- Use the `escapeHtml()` function consistently across all rendering code

#### Data Display
- Use proper `<table>` markup with `<th>` for headers
- Include meaningful column headers for screen reader users
- Ensure data tables are not overly complex

#### Report Structure
- Maintain document outline with proper heading hierarchy
- Include descriptive page titles
- Use semantic HTML over `<div>` soup

---

## Trusted Sources and References

For accessibility guidelines and best practices, this project references:

**Primary Standards:**
- [WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/) - W3C Web Content Accessibility Guidelines
- [Section 508](https://www.section508.gov/) - U.S. Federal accessibility standards
- [WAI-ARIA 1.2](https://www.w3.org/TR/wai-aria-1.2/) - Accessible Rich Internet Applications

**Comprehensive Resource Registry:**

For a complete list of vetted accessibility resources, tools, and references, see:
- [TRUSTED_SOURCES.yaml](https://github.com/mgifford/ACCESSIBILITY.md/blob/main/examples/TRUSTED_SOURCES.yaml)

This machine-readable registry includes:
- Authoritative accessibility guidance sources
- Testing tools and automation resources
- Government accessibility standards (U.S., Canada, EU, Australia, UK)
- Disability-specific resources and assistive technology documentation
- Legal and compliance references

**Tool Documentation:**
- [Lighthouse Accessibility Audits](https://developer.chrome.com/docs/lighthouse/accessibility/)
- [ScanGov](https://github.com/GSA/scan-gov) - Government website scanning
- [axe-core Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)

**Example Best Practices:**
- [SVG Accessibility](https://github.com/mgifford/ACCESSIBILITY.md/blob/main/examples/SVG_ACCESSIBILITY_BEST_PRACTICES.md)
- [Keyboard Accessibility](https://github.com/mgifford/ACCESSIBILITY.md/blob/main/examples/KEYBOARD_ACCESSIBILITY_BEST_PRACTICES.md)
- [Forms Accessibility](https://github.com/mgifford/ACCESSIBILITY.md/blob/main/examples/FORMS_ACCESSIBILITY_BEST_PRACTICES.md)

---

## AI Agent Instructions

AI coding assistants (GitHub Copilot, Cursor, Claude, etc.) working on this project must follow accessibility standards.

**See**: [AGENTS.md](./AGENTS.md) and [.kittify/AGENTS.md](./.kittify/AGENTS.md)

**Key Requirements for AI Agents:**
1. Generate accessible HTML following WCAG 2.2 AA
2. Always escape user-controlled content in HTML output
3. Use semantic HTML markup
4. Include proper lang attributes and meta tags
5. Follow UTF-8 encoding rules (no smart quotes, em dashes, or Windows-1252 characters)
6. Maintain existing accessibility patterns in the codebase

---

## Reporting Accessibility Issues

### Issues in This Repository

If you find accessibility issues in our code, reports, or documentation:

1. **Search existing issues**: Check if it has been reported
2. **Open a new issue**: Use the `accessibility` label
3. **Include details**:
   - Clear description of the barrier
   - Steps to reproduce
   - Impact severity (critical, serious, moderate, minor)
   - Suggested remediation (if known)

### Issues in Scanned Government Websites

This project generates reports on government website accessibility. If you notice accessibility issues in the websites we scan, please report them directly to the respective agency using their feedback channels.

---

## Project Structure and Accessibility

```
daily-dap/
├── src/
│   ├── scanners/           # Accessibility scanning integration
│   ├── aggregation/        # Impact estimation and metrics
│   ├── publish/            # Accessible HTML report generation
│   └── cli/                # Command-line interface
├── tests/                  # Automated testing suite
├── docs/reports/           # Published accessibility reports
└── kitty-specs/            # Project specifications
```

---

## Version History

**Version**: 0.1.0 (In Development)
- Initial accessibility commitment document
- HTML escaping and secure rendering established
- Lighthouse and ScanGov integration
- Basic accessible report structure

---

## Additional Resources

- **Project README**: [README.md](./README.md)
- **Agent Instructions**: [AGENTS.md](./AGENTS.md) and [.kittify/AGENTS.md](./.kittify/AGENTS.md)
- **Digital Analytics Program (DAP)**: https://digital.gov/guides/dap/
- **Analytics.USA.gov**: https://analytics.usa.gov/

---

## Maintenance

This document is a living commitment. It should be updated when:
- New accessibility features are added
- Testing practices change
- Known gaps are addressed
- Conformance status changes
- New tools or integrations are added

**Last Updated**: 2026-02-24
