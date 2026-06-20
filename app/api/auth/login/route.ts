import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';
import { createSession } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api-helpers';
import { normalizeMobile } from '@/lib/phone-countries';

const schema = z.object({
  password: z.string().min(1).max(100),
  email: z.string().email().optional(),
  mobile: z.string().optional(),
}).refine((data) => data.email || data.mobile, {
  message: 'Email or mobile number is required',
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());

    let user = null;
    if (body.email) {
      user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    } else if (body.mobile) {
      const mobile = normalizeMobile(body.mobile);
      if (!mobile) return jsonError('Invalid mobile number', 400);
      user = await prisma.user.findUnique({ where: { mobile } });
    }

    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return jsonError('Invalid credentials', 401);
    }

    await createSession(user.id);
    return jsonOk({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError(e.errors[0]?.message ?? 'Invalid input');
    console.error(e);
    return jsonError('Login failed', 500);
  }
}
