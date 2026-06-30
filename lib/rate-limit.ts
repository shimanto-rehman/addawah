import { kvIncr } from './kv';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

/**
 * Fixed-window rate limiter using Upstash Redis INCR + EXPIRE.
 * Falls back to allowing the request if Redis is unavailable.
 *
 * @param key   Unique key for this rate limit bucket (e.g. "rl:login:1.2.3.4")
 * @param limit Maximum requests allowed in the window
 * @param windowSeconds Window duration in seconds
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const count = await kvIncr(key, windowSeconds);

  // Redis unavailable — allow the request
  if (count === null) return { allowed: true, remaining: limit };

  if (count > limit) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: limit - count };
}
