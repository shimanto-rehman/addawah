import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { createSession } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api-helpers';
import { normalizeMobile } from '@/lib/phone-countries';
import { sendWelcomeEmail } from '@/lib/email';
import {
  isValidEmail,
  sanitizeEmail,
  sanitizeName,
  sanitizeUsername,
  validateUsername,
} from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/get-client-ip';
import { logger } from '@/lib/logger';

const schema = z.object({
  name: z.string().min(2).max(80),
  username: z.string().min(3).max(30),
  email: z.string().email(),
  mobile: z.string().min(8),
  password: z.string().min(6).max(100),
});

export async function POST(req: NextRequest) {
  const rl = await checkRateLimit(`rl:register:${getClientIp(req)}`, 3, 60);
  if (!rl.allowed) {
    return jsonError('Too many attempts. Please try again later.', 429);
  }

  try {
    const body = schema.parse(await req.json());
    const name = sanitizeName(body.name);
    const username = sanitizeUsername(body.username);
    const usernameCheck = validateUsername(username);
    if (!usernameCheck.valid) return jsonError(usernameCheck.message ?? 'Invalid username', 400);

    const mobile = normalizeMobile(body.mobile);
    if (!mobile) return jsonError('Enter a valid phone number', 400);

    const email = sanitizeEmail(body.email);
    if (!isValidEmail(email)) return jsonError('Enter a valid email address', 400);

    const [existingUsername, existingEmail, existingMobile] = await Promise.all([
      prisma.user.findUnique({ where: { username } }),
      prisma.user.findUnique({ where: { email } }),
      prisma.user.findUnique({ where: { mobile } }),
    ]);

    if (existingUsername) return jsonError('This username is already taken', 409);
    if (existingEmail) return jsonError('This email is already in use', 409);
    if (existingMobile) return jsonError('This phone number is already in use', 409);

    const user = await prisma.user.create({
      data: {
        name,
        username,
        email,
        mobile,
        passwordHash: await hashPassword(body.password),
      },
    });

    await createSession(user.id);

    sendWelcomeEmail({ to: email, name, username }).catch((err) => {
      logger.error({ route: '/api/auth/register', err }, 'Welcome email failed');
    });

    return jsonOk({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError(e.errors[0]?.message ?? 'Invalid input');
    logger.error({ route: '/api/auth/register', err: e }, 'Registration failed');
    return jsonError('Registration failed', 500);
  }
}
