import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import { validatePrevalenceConfig, TRAFFIC_WINDOW_MODES } from './schema.js';

export async function loadPrevalenceConfig(configPath) {
  const resolvedPath = path.resolve(configPath);
  const raw = await fs.readFile(resolvedPath, 'utf-8');
  const parsed = yaml.load(raw);
  const validation = validatePrevalenceConfig(parsed);

  if (!validation.valid) {
    const message = [`Invalid prevalence config at ${resolvedPath}:`, ...validation.errors.map((err) => `- ${err}`)].join('\n');
    throw new Error(message);
  }

  return Object.freeze(parsed);
}

export function applyRuntimeOverrides(config, overrides = {}) {
  const merged = structuredClone(config);

  if (overrides.urlLimit !== undefined) {
    merged.scan.url_limit = overrides.urlLimit;
  }

  if (overrides.trafficWindowMode !== undefined) {
    if (!TRAFFIC_WINDOW_MODES.has(overrides.trafficWindowMode)) {
      throw new Error(`Invalid traffic window override: ${overrides.trafficWindowMode}`);
    }
    merged.scan.traffic_window_mode = overrides.trafficWindowMode;
  }

  const validation = validatePrevalenceConfig(merged);
  if (!validation.valid) {
    throw new Error(`Runtime overrides produced invalid config:\n${validation.errors.map((e) => `- ${e}`).join('\n')}`);
  }

  return Object.freeze(merged);
}
