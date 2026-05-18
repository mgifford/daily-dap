import test from 'node:test';
import assert from 'node:assert/strict';
import { parseWebPageTestResult, runWebPageTestScan } from '../../src/scanners/webpagetest-runner.js';

test('parseWebPageTestResult keeps top savings issues first', () => {
  const parsed = parseWebPageTestResult('https://example.gov', {
    data: {
      median: {
        firstView: {
          SpeedIndex: 1111,
          lighthouse: {
            audits: {
              'unused-css-rules': { title: 'Reduce unused CSS', details: { overallSavingsMs: 100 } },
              'render-blocking-resources': {
                title: 'Eliminate render-blocking resources',
                details: { overallSavingsMs: 600 }
              }
            }
          }
        }
      }
    }
  });

  assert.equal(parsed.webpagetest_metrics.speed_index_ms, 1111);
  assert.equal(parsed.webpagetest_issues.length, 2);
  assert.equal(parsed.webpagetest_issues[0].issue_id, 'render-blocking-resources');
});

test('runWebPageTestScan returns null when runImpl is not configured', async () => {
  const parsed = await runWebPageTestScan('https://example.gov', {});
  assert.equal(parsed, null);
});
