import test from 'node:test';
import assert from 'node:assert/strict';
import { extractCodeQualityAudits } from '../../src/scanners/lighthouse-runner.js';
import { buildCodeQualitySummary } from '../../src/publish/build-daily-report.js';

// ---------------------------------------------------------------------------
// extractCodeQualityAudits
// ---------------------------------------------------------------------------

test('extractCodeQualityAudits returns null when rawResult has no audits', () => {
  assert.equal(extractCodeQualityAudits(null), null);
  assert.equal(extractCodeQualityAudits({}), null);
  assert.equal(extractCodeQualityAudits({ categories: {} }), null);
});

test('extractCodeQualityAudits extracts deprecated_apis with passing=true', () => {
  const rawResult = {
    audits: {
      'uses-deprecated-api': { score: 1, details: { items: [] } }
    }
  };
  const result = extractCodeQualityAudits(rawResult);
  assert.equal(result.deprecated_apis.passing, true);
  assert.deepEqual(result.deprecated_apis.items, []);
});

test('extractCodeQualityAudits extracts deprecated_apis with passing=false and items', () => {
  const rawResult = {
    audits: {
      'uses-deprecated-api': {
        score: 0,
        details: {
          items: [
            { value: 'CSSStyleDeclaration.getPropertyValue' },
            { text: 'Document.all' }
          ]
        }
      }
    }
  };
  const result = extractCodeQualityAudits(rawResult);
  assert.equal(result.deprecated_apis.passing, false);
  assert.equal(result.deprecated_apis.items.length, 2);
  assert.equal(result.deprecated_apis.items[0].value, 'CSSStyleDeclaration.getPropertyValue');
  assert.equal(result.deprecated_apis.items[1].value, 'Document.all');
});

test('extractCodeQualityAudits extracts errors_in_console count', () => {
  const rawResult = {
    audits: {
      'errors-in-console': {
        score: 0,
        details: {
          items: [
            { source: 'javascript', description: 'TypeError: foo is not a function' },
            { source: 'javascript', description: 'ReferenceError: bar is undefined' }
          ]
        }
      }
    }
  };
  const result = extractCodeQualityAudits(rawResult);
  assert.equal(result.errors_in_console.passing, false);
  assert.equal(result.errors_in_console.count, 2);
});

test('extractCodeQualityAudits extracts no_document_write pass/fail', () => {
  const rawResult = {
    audits: {
      'no-document-write': { score: 0, details: { items: [{ url: 'https://example.gov' }] } }
    }
  };
  const result = extractCodeQualityAudits(rawResult);
  assert.equal(result.no_document_write.passing, false);
});

test('extractCodeQualityAudits extracts vulnerable_libraries items', () => {
  const rawResult = {
    audits: {
      'no-vulnerable-libraries': {
        score: 0,
        details: {
          items: [
            {
              severity: 'High',
              detectedLib: { text: 'jquery@1.9.1' },
              vulnCount: 5
            }
          ]
        }
      }
    }
  };
  const result = extractCodeQualityAudits(rawResult);
  assert.equal(result.vulnerable_libraries.passing, false);
  assert.equal(result.vulnerable_libraries.items.length, 1);
  assert.equal(result.vulnerable_libraries.items[0].severity, 'High');
  assert.equal(result.vulnerable_libraries.items[0].library, 'jquery@1.9.1');
  assert.equal(result.vulnerable_libraries.items[0].vuln_count, 5);
});

test('extractCodeQualityAudits extracts js_libraries items', () => {
  const rawResult = {
    audits: {
      'js-libraries': {
        score: null,
        details: {
          items: [
            { name: 'jQuery', version: '3.6.0', npm: 'jquery' },
            { name: 'Bootstrap', version: '5.0.0', npm: 'bootstrap' }
          ]
        }
      }
    }
  };
  const result = extractCodeQualityAudits(rawResult);
  assert.equal(result.js_libraries.items.length, 2);
  assert.equal(result.js_libraries.items[0].name, 'jQuery');
  assert.equal(result.js_libraries.items[0].version, '3.6.0');
  assert.equal(result.js_libraries.items[1].name, 'Bootstrap');
});

test('extractCodeQualityAudits sets passing=null for absent audits', () => {
  const rawResult = { audits: {} };
  const result = extractCodeQualityAudits(rawResult);
  assert.equal(result.deprecated_apis.passing, null);
  assert.equal(result.errors_in_console.passing, null);
  assert.equal(result.no_document_write.passing, null);
  assert.equal(result.vulnerable_libraries.passing, null);
  assert.deepEqual(result.js_libraries.items, []);
});

// ---------------------------------------------------------------------------
// buildCodeQualitySummary
// ---------------------------------------------------------------------------

test('buildCodeQualitySummary returns zero counts for empty results', () => {
  const summary = buildCodeQualitySummary([]);
  assert.equal(summary.total_scanned, 0);
  assert.equal(summary.urls_with_deprecated_apis, 0);
  assert.equal(summary.urls_with_console_errors, 0);
  assert.equal(summary.urls_with_document_write, 0);
  assert.equal(summary.urls_with_vulnerable_libraries, 0);
  assert.deepEqual(summary.js_library_counts, {});
  assert.deepEqual(summary.vulnerable_library_counts, {});
});

test('buildCodeQualitySummary counts only successful results with code_quality_audits', () => {
  const urlResults = [
    {
      url: 'https://a.gov',
      scan_status: 'success',
      code_quality_audits: {
        deprecated_apis: { passing: false, items: [{ value: 'foo' }] },
        errors_in_console: { passing: true, count: 0 },
        no_document_write: { passing: true },
        vulnerable_libraries: { passing: true, items: [] },
        js_libraries: { items: [{ name: 'jQuery' }] }
      }
    },
    {
      url: 'https://b.gov',
      scan_status: 'failed',
      code_quality_audits: {
        deprecated_apis: { passing: false, items: [] },
        errors_in_console: { passing: false, count: 1 },
        no_document_write: { passing: false },
        vulnerable_libraries: { passing: false, items: [{ library: 'jquery@1.0', severity: 'High' }] },
        js_libraries: { items: [] }
      }
    },
    {
      url: 'https://c.gov',
      scan_status: 'success',
      code_quality_audits: null
    }
  ];

  const summary = buildCodeQualitySummary(urlResults);
  // Only https://a.gov is successful with audits
  assert.equal(summary.total_scanned, 1);
  assert.equal(summary.urls_with_deprecated_apis, 1);
  assert.equal(summary.urls_with_console_errors, 0);
  assert.equal(summary.urls_with_document_write, 0);
  assert.equal(summary.urls_with_vulnerable_libraries, 0);
  assert.deepEqual(summary.js_library_counts, { jQuery: 1 });
});

test('buildCodeQualitySummary aggregates js_library_counts across multiple URLs', () => {
  const makeResult = (url, libs) => ({
    url,
    scan_status: 'success',
    code_quality_audits: {
      deprecated_apis: { passing: true, items: [] },
      errors_in_console: { passing: true, count: 0 },
      no_document_write: { passing: true },
      vulnerable_libraries: { passing: true, items: [] },
      js_libraries: { items: libs.map((name) => ({ name })) }
    }
  });

  const summary = buildCodeQualitySummary([
    makeResult('https://a.gov', ['jQuery', 'Bootstrap']),
    makeResult('https://b.gov', ['jQuery', 'React']),
    makeResult('https://c.gov', ['jQuery'])
  ]);

  assert.equal(summary.total_scanned, 3);
  assert.equal(summary.js_library_counts['jQuery'], 3);
  assert.equal(summary.js_library_counts['Bootstrap'], 1);
  assert.equal(summary.js_library_counts['React'], 1);
});

test('buildCodeQualitySummary tracks vulnerable_library_counts', () => {
  const urlResults = [
    {
      url: 'https://a.gov',
      scan_status: 'success',
      code_quality_audits: {
        deprecated_apis: { passing: true, items: [] },
        errors_in_console: { passing: true, count: 0 },
        no_document_write: { passing: true },
        vulnerable_libraries: {
          passing: false,
          items: [
            { library: 'jquery@1.9.1', severity: 'High', vuln_count: 5 }
          ]
        },
        js_libraries: { items: [] }
      }
    },
    {
      url: 'https://b.gov',
      scan_status: 'success',
      code_quality_audits: {
        deprecated_apis: { passing: true, items: [] },
        errors_in_console: { passing: true, count: 0 },
        no_document_write: { passing: true },
        vulnerable_libraries: {
          passing: false,
          items: [
            { library: 'jquery@1.9.1', severity: 'High', vuln_count: 5 }
          ]
        },
        js_libraries: { items: [] }
      }
    }
  ];

  const summary = buildCodeQualitySummary(urlResults);
  assert.equal(summary.urls_with_vulnerable_libraries, 2);
  assert.equal(summary.vulnerable_library_counts['jquery@1.9.1'].count, 2);
  assert.equal(summary.vulnerable_library_counts['jquery@1.9.1'].severity, 'High');
});

test('buildCodeQualitySummary audit_urls lists affected URLs per audit', () => {
  const urlResults = [
    {
      url: 'https://a.gov',
      scan_status: 'success',
      code_quality_audits: {
        deprecated_apis: { passing: false, items: [{ value: 'foo' }] },
        errors_in_console: { passing: false, count: 1 },
        no_document_write: { passing: false },
        vulnerable_libraries: { passing: false, items: [{ library: 'lib@1', severity: 'Low' }] },
        js_libraries: { items: [] }
      }
    }
  ];

  const summary = buildCodeQualitySummary(urlResults);
  assert.deepEqual(summary.audit_urls.deprecated_apis, ['https://a.gov']);
  assert.deepEqual(summary.audit_urls.console_errors, ['https://a.gov']);
  assert.deepEqual(summary.audit_urls.document_write, ['https://a.gov']);
  assert.deepEqual(summary.audit_urls.vulnerable_libraries, ['https://a.gov']);
});
