import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPerformanceImpact, GOOD_LCP_MS, RECOMMENDED_PAGE_WEIGHT_BYTES } from '../../src/aggregation/performance-impact.js';

test('buildPerformanceImpact returns benchmark constants', () => {
  assert.equal(GOOD_LCP_MS, 2500);
  assert.equal(RECOMMENDED_PAGE_WEIGHT_BYTES, 1_600_000);
});

test('buildPerformanceImpact with no results returns zero values', () => {
  const result = buildPerformanceImpact([]);
  assert.equal(result.url_count_with_timing, 0);
  assert.equal(result.total_extra_load_time_seconds, 0);
  assert.equal(result.total_extra_load_time_hours, 0);
  assert.equal(result.total_extra_bytes, 0);
  assert.equal(result.total_extra_gigabytes, 0);
  assert.equal(result.benchmark_lcp_ms, GOOD_LCP_MS);
  assert.equal(result.benchmark_page_weight_bytes, RECOMMENDED_PAGE_WEIGHT_BYTES);
});

test('buildPerformanceImpact ignores failed and excluded scans', () => {
  const urlResults = [
    {
      scan_status: 'failed',
      url: 'https://example.gov/a',
      page_load_count: 1000,
      lcp_value_ms: 5000,
      total_byte_weight: 3_000_000
    },
    {
      scan_status: 'excluded',
      url: 'https://example.gov/b',
      page_load_count: 500,
      lcp_value_ms: 6000,
      total_byte_weight: 2_000_000
    }
  ];
  const result = buildPerformanceImpact(urlResults);
  assert.equal(result.url_count_with_timing, 0);
  assert.equal(result.total_extra_load_time_seconds, 0);
});

test('buildPerformanceImpact ignores URLs without lcp_value_ms', () => {
  const urlResults = [
    {
      scan_status: 'success',
      url: 'https://example.gov/a',
      page_load_count: 1000,
      lcp_value_ms: null,
      total_byte_weight: 2_000_000
    }
  ];
  const result = buildPerformanceImpact(urlResults);
  assert.equal(result.url_count_with_timing, 0);
  assert.equal(result.total_extra_load_time_seconds, 0);
});

test('buildPerformanceImpact calculates extra load time correctly', () => {
  // URL with LCP = 5000ms (2500ms over benchmark), 1000 loads
  // Extra seconds = (5000 - 2500) / 1000 * 1000 = 2500 seconds
  const urlResults = [
    {
      scan_status: 'success',
      url: 'https://example.gov/slow',
      page_load_count: 1000,
      lcp_value_ms: 5000,
      total_byte_weight: null
    }
  ];
  const result = buildPerformanceImpact(urlResults);
  assert.equal(result.url_count_with_timing, 1);
  assert.equal(result.total_extra_load_time_seconds, 2500);
  // 2500 seconds / 3600 = 0.69 hours
  assert.equal(result.total_extra_load_time_hours, 0.69);
});

test('buildPerformanceImpact does not count extra time for fast pages at benchmark', () => {
  const urlResults = [
    {
      scan_status: 'success',
      url: 'https://example.gov/fast',
      page_load_count: 5000,
      lcp_value_ms: 2500,
      total_byte_weight: null
    }
  ];
  const result = buildPerformanceImpact(urlResults);
  assert.equal(result.url_count_with_timing, 1);
  assert.equal(result.total_extra_load_time_seconds, 0);
});

test('buildPerformanceImpact does not count extra time for pages faster than benchmark', () => {
  const urlResults = [
    {
      scan_status: 'success',
      url: 'https://example.gov/faster',
      page_load_count: 2000,
      lcp_value_ms: 1000,
      total_byte_weight: null
    }
  ];
  const result = buildPerformanceImpact(urlResults);
  assert.equal(result.total_extra_load_time_seconds, 0);
});

test('buildPerformanceImpact calculates extra bytes correctly', () => {
  // Page weight = 2,600,000 bytes (1,000,000 over 1.6 MB benchmark), 1000 loads
  // Extra bytes = 1,000,000 * 1000 = 1,000,000,000 = 1 GB
  const urlResults = [
    {
      scan_status: 'success',
      url: 'https://example.gov/heavy',
      page_load_count: 1000,
      lcp_value_ms: 3000,
      total_byte_weight: 2_600_000
    }
  ];
  const result = buildPerformanceImpact(urlResults);
  assert.equal(result.url_count_with_weight, 1);
  assert.equal(result.total_extra_bytes, 1_000_000_000);
  assert.equal(result.total_extra_gigabytes, 1);
});

test('buildPerformanceImpact does not penalize lightweight pages', () => {
  const urlResults = [
    {
      scan_status: 'success',
      url: 'https://example.gov/light',
      page_load_count: 1000,
      lcp_value_ms: 3000,
      total_byte_weight: 800_000
    }
  ];
  const result = buildPerformanceImpact(urlResults);
  assert.equal(result.url_count_with_weight, 1);
  assert.equal(result.total_extra_bytes, 0);
});

test('buildPerformanceImpact aggregates multiple URLs', () => {
  const urlResults = [
    {
      scan_status: 'success',
      url: 'https://example.gov/a',
      page_load_count: 1000,
      lcp_value_ms: 4500,   // 2000ms over benchmark
      total_byte_weight: 3_600_000  // 2MB over benchmark
    },
    {
      scan_status: 'success',
      url: 'https://example.gov/b',
      page_load_count: 500,
      lcp_value_ms: 3500,   // 1000ms over benchmark
      total_byte_weight: 1_100_000  // under benchmark
    },
    {
      scan_status: 'failed',
      url: 'https://example.gov/c',
      page_load_count: 2000,
      lcp_value_ms: 7000,
      total_byte_weight: 5_000_000
    }
  ];
  const result = buildPerformanceImpact(urlResults);
  assert.equal(result.url_count_with_timing, 2);
  // URL a: (4500-2500)/1000 * 1000 = 2000 extra seconds
  // URL b: (3500-2500)/1000 * 500 = 500 extra seconds
  // Total: 2500 extra seconds
  assert.equal(result.total_extra_load_time_seconds, 2500);
  // URL a extra bytes: (3600000-1600000) * 1000 = 2,000,000,000
  // URL b: under benchmark, no extra
  assert.equal(result.total_extra_bytes, 2_000_000_000);
  assert.equal(result.total_extra_gigabytes, 2);
  assert.equal(result.url_count_with_weight, 2);
});

test('buildPerformanceImpact handles missing page_load_count gracefully', () => {
  const urlResults = [
    {
      scan_status: 'success',
      url: 'https://example.gov/no-traffic',
      page_load_count: null,
      lcp_value_ms: 5000,
      total_byte_weight: 3_000_000
    }
  ];
  const result = buildPerformanceImpact(urlResults);
  assert.equal(result.url_count_with_timing, 1);
  assert.equal(result.total_extra_load_time_seconds, 0);
  assert.equal(result.total_extra_bytes, 0);
});
