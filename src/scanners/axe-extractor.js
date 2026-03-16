/**
 * Extracts accessibility findings from a Lighthouse raw result.
 * Lighthouse uses axe-core for its accessibility audits, so these findings
 * represent axe-style violations with WCAG references, HTML snippets, and selectors.
 */

import { normalizeSeverity } from './scangov-runner.js';

function extractItemNodes(audit) {
  const items = audit?.details?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  return items
    .map((item) => {
      const node = item.node ?? item;
      return {
        selector: node.selector ?? null,
        snippet: node.snippet ?? null,
        node_label: node.nodeLabel ?? null,
        explanation: node.explanation ?? null
      };
    })
    .filter((node) => node.selector !== null || node.snippet !== null);
}

/**
 * Extracts failing accessibility audit findings from a Lighthouse raw result object.
 *
 * @param {object|null} lighthouseRaw - The raw Lighthouse result (lhr).
 * @returns {Array<{id: string, title: string, description: string, score: number, items: Array}>}
 */
export function extractAxeFindings(lighthouseRaw) {
  if (!lighthouseRaw?.audits || !lighthouseRaw?.categories?.accessibility) {
    return [];
  }

  const auditRefs = lighthouseRaw.categories.accessibility.auditRefs ?? [];
  const findings = [];

  for (const ref of auditRefs) {
    const audit = lighthouseRaw.audits[ref.id];
    if (!audit) {
      continue;
    }

    // Skip passing, not applicable, informative, or manual audits
    if (
      audit.score === 1 ||
      audit.scoreDisplayMode === 'notApplicable' ||
      audit.scoreDisplayMode === 'informative' ||
      audit.scoreDisplayMode === 'manual'
    ) {
      continue;
    }

    // Only include audits with a numeric failing score
    if (typeof audit.score !== 'number') {
      continue;
    }

    findings.push({
      id: audit.id,
      title: audit.title ?? '',
      description: audit.description ?? '',
      score: audit.score,
      impact: normalizeSeverity(audit.details?.debugData?.impact),
      tags: ref.tags ?? [],
      items: extractItemNodes(audit)
    });
  }

  return findings;
}
