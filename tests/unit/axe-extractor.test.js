import test from 'node:test';
import assert from 'node:assert/strict';
import { extractAxeFindings } from '../../src/scanners/axe-extractor.js';

const sampleLighthouseRaw = {
  categories: {
    accessibility: {
      score: 0.68,
      auditRefs: [
        { id: 'color-contrast', weight: 3 },
        { id: 'aria-required-attr', weight: 10 },
        { id: 'document-title', weight: 7 },
        { id: 'bypass', weight: 3 }
      ]
    }
  },
  audits: {
    'color-contrast': {
      id: 'color-contrast',
      title: 'Background and foreground colors do not have a sufficient contrast ratio.',
      description: 'Low-contrast text is difficult or impossible for many users to read.',
      score: 0,
      scoreDisplayMode: 'binary',
      details: {
        type: 'table',
        items: [
          {
            node: {
              type: 'node',
              selector: '.nav-link',
              snippet: '<a class="nav-link" href="/about">About</a>',
              nodeLabel: 'About',
              explanation: 'Fix any of the following:\n  Element has insufficient color contrast of 2.73.'
            }
          }
        ]
      }
    },
    'aria-required-attr': {
      id: 'aria-required-attr',
      title: '[role]s do not have all required [aria-*] attributes.',
      description: 'Some ARIA roles have required attributes.',
      score: 0,
      scoreDisplayMode: 'binary',
      details: {
        type: 'table',
        items: [
          {
            node: {
              type: 'node',
              selector: '[role="checkbox"]',
              snippet: '<div role="checkbox" tabindex="0">Option</div>',
              nodeLabel: 'Option',
              explanation: 'Fix any of the following:\n  Required ARIA attribute not present: aria-checked.'
            }
          }
        ]
      }
    },
    'document-title': {
      id: 'document-title',
      title: 'Document has a <title> element.',
      description: 'The title gives screen reader users an overview of the page.',
      score: 1,
      scoreDisplayMode: 'binary',
      details: { type: 'table', items: [] }
    },
    bypass: {
      id: 'bypass',
      title: 'Page contains a heading, skip link, or landmark region.',
      description: 'Adding ways to bypass repetitive content lets keyboard users navigate more efficiently.',
      score: null,
      scoreDisplayMode: 'informative',
      details: { type: 'table', items: [] }
    }
  }
};

test('extractAxeFindings returns empty array for null input', () => {
  assert.deepEqual(extractAxeFindings(null), []);
});

test('extractAxeFindings returns empty array when no audits', () => {
  assert.deepEqual(extractAxeFindings({}), []);
});

test('extractAxeFindings returns empty array when no accessibility category', () => {
  assert.deepEqual(extractAxeFindings({ audits: { 'color-contrast': { score: 0 } } }), []);
});

test('extractAxeFindings extracts failing audits with items', () => {
  const findings = extractAxeFindings(sampleLighthouseRaw);

  assert.equal(findings.length, 2, 'Should extract 2 failing audits');

  const colorContrast = findings.find((f) => f.id === 'color-contrast');
  assert.ok(colorContrast, 'Should include color-contrast finding');
  assert.equal(colorContrast.score, 0);
  assert.ok(colorContrast.title.length > 0);
  assert.ok(colorContrast.description.length > 0);
  assert.equal(colorContrast.items.length, 1);
  assert.equal(colorContrast.items[0].selector, '.nav-link');
  assert.ok(colorContrast.items[0].snippet.includes('<a'));
  assert.equal(colorContrast.items[0].node_label, 'About');
  assert.ok(colorContrast.items[0].explanation.includes('color contrast'));
});

test('extractAxeFindings skips passing audits (score === 1)', () => {
  const findings = extractAxeFindings(sampleLighthouseRaw);
  const documentTitle = findings.find((f) => f.id === 'document-title');
  assert.equal(documentTitle, undefined, 'Should not include passing audit');
});

test('extractAxeFindings skips informative audits', () => {
  const findings = extractAxeFindings(sampleLighthouseRaw);
  const bypass = findings.find((f) => f.id === 'bypass');
  assert.equal(bypass, undefined, 'Should not include informative audit');
});

test('extractAxeFindings includes aria-required-attr finding with correct data', () => {
  const findings = extractAxeFindings(sampleLighthouseRaw);
  const ariaRequired = findings.find((f) => f.id === 'aria-required-attr');
  assert.ok(ariaRequired, 'Should include aria-required-attr finding');
  assert.equal(ariaRequired.items.length, 1);
  assert.equal(ariaRequired.items[0].selector, '[role="checkbox"]');
});

test('extractAxeFindings handles missing details gracefully', () => {
  const raw = {
    categories: {
      accessibility: {
        auditRefs: [{ id: 'my-audit', weight: 5 }]
      }
    },
    audits: {
      'my-audit': {
        id: 'my-audit',
        title: 'Some audit',
        description: 'Some description',
        score: 0,
        scoreDisplayMode: 'binary'
        // no details
      }
    }
  };
  const findings = extractAxeFindings(raw);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].items.length, 0);
});

test('extractAxeFindings skips manual scoreDisplayMode audits', () => {
  const raw = {
    categories: {
      accessibility: {
        auditRefs: [{ id: 'manual-audit', weight: 5 }]
      }
    },
    audits: {
      'manual-audit': {
        id: 'manual-audit',
        title: 'Manual check',
        description: 'Requires manual review.',
        score: null,
        scoreDisplayMode: 'manual'
      }
    }
  };
  const findings = extractAxeFindings(raw);
  assert.equal(findings.length, 0, 'Should skip manual audits');
});

test('extractAxeFindings skips notApplicable audits', () => {
  const raw = {
    categories: {
      accessibility: {
        auditRefs: [{ id: 'na-audit', weight: 5 }]
      }
    },
    audits: {
      'na-audit': {
        id: 'na-audit',
        title: 'Not applicable',
        description: 'Not relevant.',
        score: null,
        scoreDisplayMode: 'notApplicable'
      }
    }
  };
  const findings = extractAxeFindings(raw);
  assert.equal(findings.length, 0, 'Should skip notApplicable audits');
});
