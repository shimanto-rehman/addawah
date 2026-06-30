import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
});

/**
 * Create a child logger with request context.
 * Use in API routes to attach request ID, user ID, route name, etc.
 */
export function createRequestLogger(context: {
  requestId?: string;
  userId?: string;
  route?: string;
  method?: string;
}) {
  return logger.child(context);
}

/**
 * Log auth events at info level for audit trail.
 */
export function logAuthEvent(
  event: 'login' | 'register' | 'logout' | 'password-reset' | 'account-delete',
  details: { userId?: string; email?: string; ip?: string; success: boolean; reason?: string },
) {
  logger.info({ event, ...details }, `Auth: ${event} - ${details.success ? 'success' : 'failed'}`);
}

/**
 * Log performance timing for slow operations.
 */
export function logPerformance(
  operation: string,
  durationMs: number,
  context?: Record<string, unknown>,
) {
  if (durationMs > 1000) {
    logger.warn({ operation, durationMs, ...context }, `Slow operation: ${operation} took ${durationMs}ms`);
  } else {
    logger.debug({ operation, durationMs, ...context }, `Operation: ${operation} took ${durationMs}ms`);
  }
}
