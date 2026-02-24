# Agent Instructions for Daily DAP

This project uses AI agents to maintain code quality and accessibility standards. For detailed agent rules and guidelines, see:

**[.kittify/AGENTS.md](./.kittify/AGENTS.md)**

## Quick Reference for AI Agents

When working on this project, always:

1. **Follow Path Reference Rules**: Use absolute or project-relative paths (e.g., `src/scanners/lighthouse-runner.js`)
2. **Use UTF-8 Encoding Only**: Never use smart quotes, em dashes, or Windows-1252 characters
3. **Maintain Accessibility**: This project benchmarks accessibility - ensure all generated HTML follows WCAG 2.2 AA standards
4. **Preserve Security**: Always use `escapeHtml()` when rendering user-controlled content in HTML
5. **Follow Testing Practices**: Run `npm test` before committing changes

## Project-Specific Context

- **Purpose**: Daily benchmarking of U.S. government website quality using Lighthouse and ScanGov
- **Key Components**: Accessibility scanning, impact estimation, HTML report generation
- **Testing**: Node.js built-in test runner with unit, contract, and integration tests
- **Build**: Standard npm scripts, compatible with Node.js >= 22.19

For complete accessibility guidelines specific to this project, see [ACCESSIBILITY.md](./ACCESSIBILITY.md).
