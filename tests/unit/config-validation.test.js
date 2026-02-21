import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePrevalenceConfig } from '../../src/config/schema.js';
import { loadPrevalenceConfig, applyRuntimeOverrides } from '../../src/config/prevalence-loader.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.resolve(currentDir, '../../src/config/prevalence.yaml');

test('validatePrevalenceConfig accepts default config shape', async () => {
  const config = await loadPrevalenceConfig(configPath);
  const result = validatePrevalenceConfig(config);
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test('validatePrevalenceConfig rejects missing severity weights', () => {
  const invalid = {
    scan: {
      url_limit: 100,
      history_lookback_days: 30,
      traffic_window_mode: 'daily'
    },
    impact: {
      prevalence_rates: {
        blindness: 0.01
      },
      severity_weights: {
        critical: 1,
        serious: 0.6,
        moderate: 0.3
      },
      fallback_severity_weight: 0.2
    }
  };

  const result = validatePrevalenceConfig(invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('impact.severity_weights.minor')));
});

test('applyRuntimeOverrides supports window and limit overrides', async () => {
  const config = await loadPrevalenceConfig(configPath);
  const merged = applyRuntimeOverrides(config, {
    urlLimit: 250,
    trafficWindowMode: 'rolling_7d'
  });

  assert.equal(merged.scan.url_limit, 250);
  assert.equal(merged.scan.traffic_window_mode, 'rolling_7d');
});

test('applyRuntimeOverrides rejects invalid traffic window', async () => {
  const config = await loadPrevalenceConfig(configPath);
  assert.throws(() => {
    applyRuntimeOverrides(config, { trafficWindowMode: 'invalid_mode' });
  }, /Invalid traffic window override/);
});
