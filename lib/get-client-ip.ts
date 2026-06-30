import type { NextRequest } from 'next/server';

/**
 * Extract client IP from Vercel's x-forwarded-for header.
 * Falls to 'unknown' if unavailable.
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return 'unknown';
}
