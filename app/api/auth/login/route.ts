import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';
import { createSession } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api-helpers';
import { normalizeMobile } from '@/lib/phone-countries';
import { checkRateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/get-client-ip';
import { logger } from '@/lib/logger';
import { isValidEmail, sanitizeEmail, sanitizeUsername } from '@/lib/validation';

const schema = z.object({
  password: z.string().min(1).max(100),
  // New: single field for email OR username
  identifier: z.string().optional(),
  // Legacy: keep for backward compatibility
  email: z.string().email().optional(),
  mobile: z.string().optional(),
}).refine((data) => data.identifier || data.email || data.mobile, {
  message: 'Email, username, or mobile number is required',
});

export async function POST(req: NextRequest) {
  const rl = await checkRateLimit(`rl:login:${getClientIp(req)}`, 5, 60);
  if (!rl.allowed) {
    return jsonError('Too many attempts. Please try again later.', 429);
  }

  try {
    const body = schema.parse(await req.json());

    let user = null;

    if (body.mobile) {
      // Mobile login — unchanged
      const mobile = normalizeMobile(body.mobile);
      if (!mobile) return jsonError('Invalid mobile number', 400);
      user = await prisma.user.findUnique({ where: { mobile } });
    } else if (body.identifier) {
      // New: identifier field — detect if email or username
      const input = body.identifier.trim();
      if (input.includes('@')) {
        // Looks like an email
        const email = sanitizeEmail(input);
        if (!isValidEmail(email)) return jsonError('Enter a valid email address', 400);
        user = await prisma.user.findUnique({ where: { email } });
      } else {
        // Looks like a username
        const username = sanitizeUsername(input);
        if (username.length < 3) return jsonError('Enter a valid email or username', 400);
        user = await prisma.user.findFirst({
          where: { username: { equals: username, mode: 'insensitive' } },
        });
      }
    } else if (body.email) {
      // Legacy email field — backward compatibility
      user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    }

    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return jsonError('Invalid credentials', 401);
    }

    await createSession(user.id);
    return jsonOk({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError(e.errors[0]?.message ?? 'Invalid input');
    logger.error({ route: '/api/auth/login', err: e }, 'Login failed');
    return jsonError('Login failed', 500);
  }
}
