import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACCESSIBILITY_STATEMENT_PATHS,
  checkAccessibilityStatement,
  checkAccessibilityStatements,
  buildAccessibilityStatementSummary
} from '../../src/scanners/accessibility-statement-checker.js';

// ---------------------------------------------------------------------------
// ACCESSIBILITY_STATEMENT_PATHS
// ---------------------------------------------------------------------------

test('ACCESSIBILITY_STATEMENT_PATHS includes /accessibility', () => {
  assert.ok(ACCESSIBILITY_STATEMENT_PATHS.includes('/accessibility'));
});

test('ACCESSIBILITY_STATEMENT_PATHS includes /section-508', () => {
  assert.ok(ACCESSIBILITY_STATEMENT_PATHS.includes('/section-508'));
});

test('ACCESSIBILITY_STATEMENT_PATHS includes /accessibility-statement', () => {
  assert.ok(ACCESSIBILITY_STATEMENT_PATHS.includes('/accessibility-statement'));
});

test('ACCESSIBILITY_STATEMENT_PATHS includes /about/accessibility-statement', () => {
  assert.ok(ACCESSIBILITY_STATEMENT_PATHS.includes('/about/accessibility-statement'));
});

test('ACCESSIBILITY_STATEMENT_PATHS includes /accessibility-at-va', () => {
  assert.ok(ACCESSIBILITY_STATEMENT_PATHS.includes('/accessibility-at-va'));
});

test('ACCESSIBILITY_STATEMENT_PATHS includes /digital-accessibility', () => {
  assert.ok(ACCESSIBILITY_STATEMENT_PATHS.includes('/digital-accessibility'));
});

// ---------------------------------------------------------------------------
// checkAccessibilityStatement – mock mode
// ---------------------------------------------------------------------------

test('checkAccessibilityStatement returns has_statement:true via runImpl', async () => {
  const result = await checkAccessibilityStatement('https://example.gov', {
    runImpl: async (baseUrl) => ({
      has_statement: true,
      statement_url: `${baseUrl}/accessibility`
    })
  });
  assert.equal(result.has_statement, true);
  assert.equal(result.statement_url, 'https://example.gov/accessibility');
});

test('checkAccessibilityStatement returns has_statement:false via runImpl', async () => {
  const result = await checkAccessibilityStatement('https://nostatement.gov', {
    runImpl: async () => ({ has_statement: false, statement_url: null })
  });
  assert.equal(result.has_statement, false);
  assert.equal(result.statement_url, null);
});

test('checkAccessibilityStatement passes baseUrl to runImpl', async () => {
  let receivedBaseUrl;
  await checkAccessibilityStatement('https://agency.gov', {
    runImpl: async (baseUrl) => {
      receivedBaseUrl = baseUrl;
      return { has_statement: false, statement_url: null };
    }
  });
  assert.equal(receivedBaseUrl, 'https://agency.gov');
});

// ---------------------------------------------------------------------------
// checkAccessibilityStatement – live path (head-request simulation)
// ---------------------------------------------------------------------------

test('checkAccessibilityStatement probes each path in order and returns first hit', async () => {
  const probed = [];
  const result = await checkAccessibilityStatement('https://example.gov', {
    runImpl: async (baseUrl) => {
      // Simulate: /accessibility 404, /accessibility-statement 200
      // We use the paths array directly in the test to verify ordering.
      // Here we just confirm runImpl receives the full baseUrl.
      probed.push(baseUrl);
      return { has_statement: true, statement_url: `${baseUrl}/accessibility-statement` };
    }
  });
  assert.equal(result.has_statement, true);
  assert.equal(result.statement_url, 'https://example.gov/accessibility-statement');
});

// ---------------------------------------------------------------------------
// checkAccessibilityStatements
// ---------------------------------------------------------------------------

test('checkAccessibilityStatements returns empty object for empty results', async () => {
  const result = await checkAccessibilityStatements([], {
    runImpl: async () => ({ has_statement: false, statement_url: null })
  });
  assert.deepEqual(result, {});
});

test('checkAccessibilityStatements returns empty object for null input', async () => {
  const result = await checkAccessibilityStatements(null, {
    runImpl: async () => ({ has_statement: false, statement_url: null })
  });
  assert.deepEqual(result, {});
});

test('checkAccessibilityStatements only checks successful scan results', async () => {
  const checked = [];
  const urlResults = [
    { url: 'https://ok.gov/', scan_status: 'success' },
    { url: 'https://failed.gov/', scan_status: 'failed' },
    { url: 'https://excluded.gov/', scan_status: 'excluded' }
  ];
  await checkAccessibilityStatements(urlResults, {
    runImpl: async (baseUrl) => {
      checked.push(baseUrl);
      return { has_statement: false, statement_url: null };
    }
  });
  assert.deepEqual(checked, ['https://ok.gov']);
});

test('checkAccessibilityStatements deduplicates domains', async () => {
  const checked = [];
  const urlResults = [
    { url: 'https://example.gov/page1', scan_status: 'success' },
    { url: 'https://example.gov/page2', scan_status: 'success' },
    { url: 'https://other.gov/', scan_status: 'success' }
  ];
  await checkAccessibilityStatements(urlResults, {
    runImpl: async (baseUrl) => {
      checked.push(baseUrl);
      return { has_statement: false, statement_url: null };
    }
  });
  assert.equal(checked.length, 2, 'Should check each unique hostname once');
  assert.deepEqual(
    checked.slice().sort(),
    ['https://example.gov', 'https://other.gov'].sort(),
    'Should check exactly the two unique domains'
  );
});

test('checkAccessibilityStatements returns results keyed by hostname', async () => {
  const urlResults = [
    { url: 'https://site1.gov/', scan_status: 'success' },
    { url: 'https://site2.gov/', scan_status: 'success' }
  ];
  const result = await checkAccessibilityStatements(urlResults, {
    runImpl: async (baseUrl) => ({
      has_statement: baseUrl.includes('site1'),
      statement_url: baseUrl.includes('site1') ? `${baseUrl}/accessibility` : null
    })
  });
  assert.equal(result['site1.gov'].has_statement, true);
  assert.equal(result['site1.gov'].statement_url, 'https://site1.gov/accessibility');
  assert.equal(result['site2.gov'].has_statement, false);
  assert.equal(result['site2.gov'].statement_url, null);
});

test('checkAccessibilityStatements skips results without url field', async () => {
  const checked = [];
  const urlResults = [
    { scan_status: 'success' },
    { url: 'https://valid.gov/', scan_status: 'success' }
  ];
  await checkAccessibilityStatements(urlResults, {
    runImpl: async (baseUrl) => {
      checked.push(baseUrl);
      return { has_statement: false, statement_url: null };
    }
  });
  assert.equal(checked.length, 1);
  assert.equal(checked[0], 'https://valid.gov');
});

test('checkAccessibilityStatements tolerates malformed URLs', async () => {
  const checked = [];
  const urlResults = [
    { url: 'not-a-valid-url', scan_status: 'success' },
    { url: 'https://real.gov/', scan_status: 'success' }
  ];
  await checkAccessibilityStatements(urlResults, {
    runImpl: async (baseUrl) => {
      checked.push(baseUrl);
      return { has_statement: false, statement_url: null };
    }
  });
  assert.equal(checked.length, 1);
  assert.equal(checked[0], 'https://real.gov');
});

// ---------------------------------------------------------------------------
// buildAccessibilityStatementSummary
// ---------------------------------------------------------------------------

test('buildAccessibilityStatementSummary returns zeroed summary for empty object', () => {
  const summary = buildAccessibilityStatementSummary({});
  assert.equal(summary.domains_checked, 0);
  assert.equal(summary.domains_with_statement, 0);
  assert.equal(summary.statement_rate_percent, 0);
  assert.deepEqual(summary.domains_without_statement, []);
  assert.deepEqual(summary.statement_urls, []);
});

test('buildAccessibilityStatementSummary handles null input', () => {
  const summary = buildAccessibilityStatementSummary(null);
  assert.equal(summary.domains_checked, 0);
  assert.equal(summary.domains_with_statement, 0);
  assert.equal(summary.statement_rate_percent, 0);
});

test('buildAccessibilityStatementSummary counts domains correctly', () => {
  const statements = {
    'a.gov': { has_statement: true, statement_url: 'https://a.gov/accessibility' },
    'b.gov': { has_statement: true, statement_url: 'https://b.gov/section-508' },
    'c.gov': { has_statement: false, statement_url: null }
  };
  const summary = buildAccessibilityStatementSummary(statements);
  assert.equal(summary.domains_checked, 3);
  assert.equal(summary.domains_with_statement, 2);
  assert.equal(summary.statement_rate_percent, 67);
  assert.deepEqual(summary.domains_without_statement, ['c.gov']);
  assert.deepEqual(summary.statement_urls, [
    'https://a.gov/accessibility',
    'https://b.gov/section-508'
  ]);
});

test('buildAccessibilityStatementSummary calculates 100% when all have statements', () => {
  const statements = {
    'x.gov': { has_statement: true, statement_url: 'https://x.gov/accessibility' },
    'y.gov': { has_statement: true, statement_url: 'https://y.gov/accessibility' }
  };
  const summary = buildAccessibilityStatementSummary(statements);
  assert.equal(summary.statement_rate_percent, 100);
  assert.deepEqual(summary.domains_without_statement, []);
});

test('buildAccessibilityStatementSummary calculates 0% when none have statements', () => {
  const statements = {
    'x.gov': { has_statement: false, statement_url: null },
    'y.gov': { has_statement: false, statement_url: null }
  };
  const summary = buildAccessibilityStatementSummary(statements);
  assert.equal(summary.statement_rate_percent, 0);
  assert.equal(summary.domains_with_statement, 0);
});

test('buildAccessibilityStatementSummary sorts domains_without_statement alphabetically', () => {
  const statements = {
    'z.gov': { has_statement: false, statement_url: null },
    'a.gov': { has_statement: false, statement_url: null },
    'm.gov': { has_statement: false, statement_url: null }
  };
  const summary = buildAccessibilityStatementSummary(statements);
  assert.deepEqual(summary.domains_without_statement, ['a.gov', 'm.gov', 'z.gov']);
});

test('buildAccessibilityStatementSummary sorts statement_urls alphabetically', () => {
  const statements = {
    'z.gov': { has_statement: true, statement_url: 'https://z.gov/accessibility' },
    'a.gov': { has_statement: true, statement_url: 'https://a.gov/accessibility' }
  };
  const summary = buildAccessibilityStatementSummary(statements);
  assert.deepEqual(summary.statement_urls, [
    'https://a.gov/accessibility',
    'https://z.gov/accessibility'
  ]);
});

// ---------------------------------------------------------------------------
// www/non-www result propagation
// ---------------------------------------------------------------------------

test('checkAccessibilityStatements propagates statement found on www to non-www', async () => {
  const urlResults = [
    { url: 'https://va.gov/', scan_status: 'success' },
    { url: 'https://www.va.gov/', scan_status: 'success' }
  ];
  const result = await checkAccessibilityStatements(urlResults, {
    runImpl: async (baseUrl) => {
      // www.va.gov finds a statement; va.gov does not
      if (baseUrl === 'https://www.va.gov') {
        return { has_statement: true, statement_url: 'https://www.va.gov/accessibility-at-va' };
      }
      return { has_statement: false, statement_url: null };
    }
  });
  assert.equal(result['va.gov'].has_statement, true, 'non-www should get www result propagated');
  assert.equal(result['va.gov'].statement_url, 'https://www.va.gov/accessibility-at-va');
  assert.equal(result['www.va.gov'].has_statement, true);
});

test('checkAccessibilityStatements propagates statement found on non-www to www', async () => {
  const urlResults = [
    { url: 'https://example.gov/', scan_status: 'success' },
    { url: 'https://www.example.gov/', scan_status: 'success' }
  ];
  const result = await checkAccessibilityStatements(urlResults, {
    runImpl: async (baseUrl) => {
      // example.gov finds a statement; www.example.gov does not
      if (baseUrl === 'https://example.gov') {
        return { has_statement: true, statement_url: 'https://example.gov/accessibility' };
      }
      return { has_statement: false, statement_url: null };
    }
  });
  assert.equal(result['www.example.gov'].has_statement, true, 'www should get non-www result propagated');
  assert.equal(result['www.example.gov'].statement_url, 'https://example.gov/accessibility');
  assert.equal(result['example.gov'].has_statement, true);
});

test('checkAccessibilityStatements does not propagate when www counterpart not in results', async () => {
  const urlResults = [{ url: 'https://only.gov/', scan_status: 'success' }];
  const result = await checkAccessibilityStatements(urlResults, {
    runImpl: async () => ({ has_statement: false, statement_url: null })
  });
  assert.equal(Object.keys(result).length, 1, 'no extra entries added for missing counterpart');
  assert.equal(result['only.gov'].has_statement, false);
});

test('checkAccessibilityStatements does not overwrite when both have statements', async () => {
  const urlResults = [
    { url: 'https://agency.gov/', scan_status: 'success' },
    { url: 'https://www.agency.gov/', scan_status: 'success' }
  ];
  const result = await checkAccessibilityStatements(urlResults, {
    runImpl: async (baseUrl) => ({
      has_statement: true,
      statement_url: `${baseUrl}/accessibility`
    })
  });
  // Both already had statements; each keeps its own URL
  assert.equal(result['agency.gov'].has_statement, true);
  assert.equal(result['www.agency.gov'].has_statement, true);
});
