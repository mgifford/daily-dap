import crypto from 'node:crypto';

export function createRunMetadata({ runDate, trafficWindowMode, urlLimit, source = 'dap' }) {
  const date = runDate ?? new Date().toISOString().slice(0, 10);
  const seed = `${date}:${trafficWindowMode}:${urlLimit}:${source}`;
  const digest = crypto.createHash('sha1').update(seed).digest('hex').slice(0, 10);

  return {
    run_id: `run-${date}-${digest}`,
    run_date: date,
    traffic_window_mode: trafficWindowMode,
    url_limit_requested: urlLimit,
    source,
    generated_at: new Date().toISOString()
  };
}
