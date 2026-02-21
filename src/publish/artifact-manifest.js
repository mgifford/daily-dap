import crypto from 'node:crypto';

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function toStableJson(payload) {
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function buildArtifactManifest({ runId, runDate, report, historyIndex }) {
  const reportPath = `docs/reports/daily/${runDate}/report.json`;
  const historyPath = 'docs/reports/history.json';

  const reportContent = toStableJson(report);
  const historyContent = toStableJson(historyIndex);

  return {
    run_id: runId,
    run_date: runDate,
    generated_at: new Date().toISOString(),
    files: [
      {
        path: reportPath,
        sha256: sha256(reportContent),
        bytes: Buffer.byteLength(reportContent, 'utf8')
      },
      {
        path: historyPath,
        sha256: sha256(historyContent),
        bytes: Buffer.byteLength(historyContent, 'utf8')
      }
    ]
  };
}
