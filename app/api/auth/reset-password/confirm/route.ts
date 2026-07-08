import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { jsonError, jsonOk } from '@/lib/api-helpers';
import { confirmPasswordReset } from '@/lib/password-reset-service';

const schema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(6).max(100),
    confirmPassword: z.string().min(6).max(100),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const result = await confirmPasswordReset(body.token, body.password);

    if (!result.ok) return jsonError(result.error, 400);

    return jsonOk({ ok: true, message: 'Password updated successfully' });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError(e.errors[0]?.message ?? 'Invalid input');
    logger.error({ route: '/api/auth/reset-password/confirm', err: e }, 'Could not reset password');
    return jsonError('Could not reset password', 500);
  }
}
