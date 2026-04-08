/**
 * Lightweight error reporter — logs to console in dev,
 * ready to plug in Sentry/LogRocket in production.
 */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  // Always log to console
  console.error("[Vanity Palms Error]", message, { stack, ...context });

  // TODO: Replace with Sentry.captureException(error, { extra: context }) in production
}
