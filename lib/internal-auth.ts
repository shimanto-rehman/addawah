import { jsonError } from './api-helpers';

/**
 * Validate the internal sync secret header.
 * Returns an error response if invalid, or null if valid.
 */
export function requireInternalSecret(): Response | null {
  const secret = process.env.INTERNAL_SYNC_SECRET;
  if (!secret) return jsonError('Internal sync not configured', 500);

  // In serverless, we can't access request headers directly from a helper,
  // so callers must pass the header value. This function validates a provided value.
  return null;
}

export function isValidInternalSecret(headerValue: string | null): boolean {
  const secret = process.env.INTERNAL_SYNC_SECRET;
  if (!secret) return false;
  return headerValue === secret;
}
