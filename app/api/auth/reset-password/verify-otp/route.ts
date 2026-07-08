import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { jsonError, jsonOk } from '@/lib/api-helpers';
import { verifyPasswordResetOtp } from '@/lib/password-reset-service';

const schema = z.object({
  email: z.string().email(),
  otp: z.string().min(6).max(6),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const result = await verifyPasswordResetOtp(body.email, body.otp);

    if (!result.ok) return jsonError(result.error, 400);

    return jsonOk({
      ok: true,
      resetToken: result.resetToken,
      user: result.user,
    });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError(e.errors[0]?.message ?? 'Invalid input');
    logger.error({ route: '/api/auth/reset-password/verify-otp', err: e }, 'Could not verify code');
    return jsonError('Could not verify code', 500);
  }
}
