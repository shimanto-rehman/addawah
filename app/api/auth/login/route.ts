import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';
import { createSession } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api-helpers';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return jsonError('Invalid email or password', 401);
    }
    await createSession(user.id);
    return jsonOk({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError('Invalid input');
    console.error(e);
    return jsonError('Login failed', 500);
  }
}
