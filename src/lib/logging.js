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
