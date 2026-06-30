import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonError, jsonOk } from '@/lib/api-helpers';
import { normalizeMobile } from '@/lib/phone-countries';
import { isValidEmail, sanitizeEmail, sanitizeUsername, validateUsername } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/get-client-ip';

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

  if (sp.has('username')) {
    const username = sanitizeUsername(sp.get('username') ?? '');
    const check = validateUsername(username);
    if (!check.valid) {
      return jsonOk({ username: { valid: false, available: false, message: check.message ?? null } satisfies FieldResult });
    }
    const taken = await prisma.user.findFirst({
      where: { username, ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}) },
      select: { id: true },
    });
    return jsonOk({
      username: {
        valid: true,
        available: !taken,
        message: taken ? 'This username is already taken' : null,
      } satisfies FieldResult,
    });
  }

  if (sp.has('email')) {
    const email = sanitizeEmail(sp.get('email') ?? '');
    if (!isValidEmail(email)) {
      return jsonOk({ email: { valid: false, available: false, message: 'Enter a valid email address' } satisfies FieldResult });
    }
    const taken = await prisma.user.findFirst({
      where: { email, ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}) },
      select: { id: true },
    });
    return jsonOk({
      email: {
        valid: true,
        available: !taken,
        message: taken ? 'This email is already in use' : null,
      } satisfies FieldResult,
    });
  }

  if (sp.has('mobile')) {
    const mobile = normalizeMobile(sp.get('mobile') ?? '');
    if (!mobile) {
      return jsonOk({ mobile: { valid: false, available: false, message: 'Enter a valid phone number' } satisfies FieldResult });
    }
    const taken = await prisma.user.findFirst({
      where: { mobile, ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}) },
      select: { id: true },
    });
    return jsonOk({
      mobile: {
        valid: true,
        available: !taken,
        message: taken ? 'This phone number is already in use' : null,
      } satisfies FieldResult,
    });
  }

  return jsonOk({});
}
