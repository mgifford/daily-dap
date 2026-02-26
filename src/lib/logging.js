export function createLogEvent({ level, code, message, context = {} }) {
  return {
    level,
    code,
    message,
    context,
    timestamp: new Date().toISOString()
  };
}

export function createWarningEvent(code, message, context = {}) {
  return createLogEvent({ level: 'warning', code, message, context });
}

export function createErrorEvent(code, message, context = {}) {
  return createLogEvent({ level: 'error', code, message, context });
}

export function logProgress(stage, message, details = {}) {
  const timestamp = new Date().toISOString();
  const detailsStr = Object.keys(details).length > 0 ? ` | ${JSON.stringify(details)}` : '';
  console.log(`[${timestamp}] [${stage}] ${message}${detailsStr}`);
}

export function logStageStart(stage, details = {}) {
  logProgress(stage, 'Starting...', details);
}

export function logStageComplete(stage, details = {}) {
  logProgress(stage, 'Complete', details);
}
