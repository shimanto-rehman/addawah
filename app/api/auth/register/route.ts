import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/password';
import { createSession } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api-helpers';

const schema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (existing) return jsonError('Email already registered', 409);

    const user = await prisma.user.create({
      data: {
        name: body.name.trim(),
        email: body.email.toLowerCase(),
        passwordHash: await hashPassword(body.password),
      },
    });

    await createSession(user.id);
    return jsonOk({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError(e.errors[0]?.message ?? 'Invalid input');
    console.error(e);
    return jsonError('Registration failed', 500);
  }
}
