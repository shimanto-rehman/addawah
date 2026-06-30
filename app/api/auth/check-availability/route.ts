import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonError, jsonOk } from '@/lib/api-helpers';
import { normalizeMobile } from '@/lib/phone-countries';
import { isValidEmail, sanitizeEmail, sanitizeUsername, validateUsername } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/get-client-ip';
import { kvGetJson, kvSetJson } from '@/lib/kv';

const CACHE_TTL_SECONDS = 30;

type FieldResult = {
  valid: boolean;
  available: boolean;
  message: string | null;
};

export async function GET(req: NextRequest) {
  const rl = await checkRateLimit(`rl:check-avail:${getClientIp(req)}`, 10, 60);
  if (!rl.allowed) {
    return jsonError('Too many requests. Please try again later.', 429);
  }

  const sp = new URL(req.url).searchParams;
  const excludeUserId = sp.get('excludeUserId') ?? undefined;

  // New: identifier field for sign-in (checks if email/username EXISTS)
  if (sp.has('identifier')) {
    const raw = (sp.get('identifier') ?? '').trim();
    if (!raw) {
      return jsonOk({ identifier: { valid: false, exists: false, message: null } });
    }

    if (raw.includes('@')) {
      // Email
      const email = sanitizeEmail(raw);
      if (!isValidEmail(email)) {
        return jsonOk({ identifier: { valid: false, exists: false, message: 'Enter a valid email address' } });
      }

      const cacheKey = `avail:signin:email:${email}`;
      const cached = await kvGetJson<{ valid: boolean; exists: boolean; message: string | null }>(cacheKey);
      if (cached) return jsonOk({ identifier: cached });

      const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      const result = { valid: true, exists: !!user, message: user ? null : 'No account found with this email' };
      await kvSetJson(cacheKey, result, CACHE_TTL_SECONDS);
      return jsonOk({ identifier: result });
    } else {
      // Username
      const username = sanitizeUsername(raw);
      const check = validateUsername(username);
      if (!check.valid) {
        return jsonOk({ identifier: { valid: false, exists: false, message: check.message ?? 'Invalid username' } });
      }

      const cacheKey = `avail:signin:username:${username}`;
      const cached = await kvGetJson<{ valid: boolean; exists: boolean; message: string | null }>(cacheKey);
      if (cached) return jsonOk({ identifier: cached });

      const user = await prisma.user.findFirst({
        where: { username: { equals: username, mode: 'insensitive' } },
        select: { id: true },
      });
      const result = { valid: true, exists: !!user, message: user ? null : 'No account found with this username' };
      await kvSetJson(cacheKey, result, CACHE_TTL_SECONDS);
      return jsonOk({ identifier: result });
    }
  }

  if (sp.has('username')) {
    const username = sanitizeUsername(sp.get('username') ?? '');
    const check = validateUsername(username);
    if (!check.valid) {
      return jsonOk({ username: { valid: false, available: false, message: check.message ?? null } satisfies FieldResult });
    }

    const cacheKey = `avail:username:${username}`;
    const cached = await kvGetJson<FieldResult>(cacheKey);
    if (cached) return jsonOk({ username: cached });

    const taken = await prisma.user.findFirst({
      where: { username, ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}) },
      select: { id: true },
    });

    const result: FieldResult = {
      valid: true,
      available: !taken,
      message: taken ? 'This username is already taken' : null,
    };

    await kvSetJson(cacheKey, result, CACHE_TTL_SECONDS);
    return jsonOk({ username: result });
  }

  if (sp.has('email')) {
    const email = sanitizeEmail(sp.get('email') ?? '');
    if (!isValidEmail(email)) {
      return jsonOk({ email: { valid: false, available: false, message: 'Enter a valid email address' } satisfies FieldResult });
    }

    const cacheKey = `avail:email:${email}`;
    const cached = await kvGetJson<FieldResult>(cacheKey);
    if (cached) return jsonOk({ email: cached });

    const taken = await prisma.user.findFirst({
      where: { email, ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}) },
      select: { id: true },
    });

    const result: FieldResult = {
      valid: true,
      available: !taken,
      message: taken ? 'This email is already in use' : null,
    };

    await kvSetJson(cacheKey, result, CACHE_TTL_SECONDS);
    return jsonOk({ email: result });
  }

  if (sp.has('mobile')) {
    const mobile = normalizeMobile(sp.get('mobile') ?? '');
    if (!mobile) {
      return jsonOk({ mobile: { valid: false, available: false, message: 'Enter a valid phone number' } satisfies FieldResult });
    }

    const cacheKey = `avail:mobile:${mobile}`;
    const cached = await kvGetJson<FieldResult>(cacheKey);
    if (cached) return jsonOk({ mobile: cached });

    const taken = await prisma.user.findFirst({
      where: { mobile, ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}) },
      select: { id: true },
    });

    const result: FieldResult = {
      valid: true,
      available: !taken,
      message: taken ? 'This phone number is already in use' : null,
    };

    await kvSetJson(cacheKey, result, CACHE_TTL_SECONDS);
    return jsonOk({ mobile: result });
  }

  return jsonOk({});
}
