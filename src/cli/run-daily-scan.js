#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPrevalenceConfig, applyRuntimeOverrides } from '../config/prevalence-loader.js';
import { getNormalizedTopPages } from '../ingest/dap-source.js';
import { createRunMetadata } from '../lib/run-metadata.js';
import { createWarningEvent } from '../lib/logging.js';

function parseArgs(argv) {
  const args = {
    dryRun: false,
    configPath: null,
    sourceFile: null,
    urlLimit: undefined,
    trafficWindowMode: undefined,
    runDate: undefined
  };

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    switch (token) {
      case '--dry-run':
        args.dryRun = true;
        break;
      case '--config':
        args.configPath = argv[++index];
        break;
      case '--source-file':
        args.sourceFile = argv[++index];
        break;
      case '--limit':
        args.urlLimit = Number(argv[++index]);
        break;
      case '--traffic-window':
        args.trafficWindowMode = argv[++index];
        break;
      case '--date':
        args.runDate = argv[++index];
        break;
      default:
        throw new Error(`Unknown argument: ${token}`);
    }
  }

  return args;
}

function getDefaultConfigPath() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(currentDir, '../config/prevalence.yaml');
}

async function main() {
  const args = parseArgs(process.argv);
  const configPath = args.configPath ?? getDefaultConfigPath();

  const baseConfig = await loadPrevalenceConfig(configPath);
  const runtimeConfig = applyRuntimeOverrides(baseConfig, {
    urlLimit: args.urlLimit,
    trafficWindowMode: args.trafficWindowMode
  });

  const runMetadata = createRunMetadata({
    runDate: args.runDate,
    trafficWindowMode: runtimeConfig.scan.traffic_window_mode,
    urlLimit: runtimeConfig.scan.url_limit,
    source: 'dap'
  });

  const normalized = await getNormalizedTopPages({
    endpoint: runtimeConfig.sources?.dap_top_pages_endpoint,
    sourceFile: args.sourceFile,
    limit: runtimeConfig.scan.url_limit,
    sourceDate: runMetadata.run_date
  });

  const warningEvents = normalized.warnings.map((warning) =>
    createWarningEvent(warning.code, warning.message, { url: warning.url })
  );

  if (args.dryRun) {
    const preview = {
      mode: 'dry-run',
      run_metadata: runMetadata,
      counts: {
        normalized_record_count: normalized.records.length,
        warning_count: warningEvents.length,
        excluded_count: normalized.excluded.length
      }
    };

    console.log(JSON.stringify(preview, null, 2));
    return;
  }

  throw new Error('WP01 scaffolding supports dry-run preview only. Full pipeline execution arrives in later work packages.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
