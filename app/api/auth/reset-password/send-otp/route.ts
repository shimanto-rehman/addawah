import { NextRequest } from 'next/server';
import { z } from 'zod';
import { jsonError, jsonOk } from '@/lib/api-helpers';
import { sendPasswordResetOtp } from '@/lib/password-reset-service';
import { checkRateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/get-client-ip';

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  const rl = await checkRateLimit(`rl:send-otp:${getClientIp(req)}`, 3, 60);
  if (!rl.allowed) {
    return jsonError('Too many attempts. Please try again later.', 429);
  }

  try {
    const body = schema.parse(await req.json());
    const result = await sendPasswordResetOtp(body.email);

    if (!result.ok) return jsonError(result.error, 400);

    return jsonOk({
      ok: true,
      message: 'If an account exists for this email, a verification code has been sent.',
      emailMasked: result.emailMasked,
    });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError(e.errors[0]?.message ?? 'Invalid input');
    console.error(e);
    return jsonError('Could not send verification code', 500);
  }
}
