import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiRequireAuth, jsonError, jsonOk } from '@/lib/api-helpers';
import { destroySession } from '@/lib/auth';
import { DELETE_CONFIRMATION_PHRASE, isDeletePhraseValid } from '@/lib/account-deletion';
import {
  getDeletionStatus,
  purgeUserAccount,
  verifyAccountDeletionOtp,
} from '@/lib/account-deletion-service';
import { verifyPassword } from '@/lib/password';
import { isEmailConfigured } from '@/lib/email';

const deleteSchema = z.object({
  password: z.string().min(1),
  confirmationPhrase: z.string().min(1),
  understandPermanent: z.literal(true),
  understandDataLoss: z.literal(true),
  otp: z.string().optional(),
});

export async function GET() {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const status = await getDeletionStatus(user!.id, user!.email);
  return jsonOk(status);
}

export async function DELETE(req: NextRequest) {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  try {
    const body = deleteSchema.parse(await req.json());

    if (!isDeletePhraseValid(body.confirmationPhrase)) {
      return jsonError(`Type exactly: "${DELETE_CONFIRMATION_PHRASE}"`, 400);
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user!.id },
      select: { passwordHash: true },
    });
    if (!dbUser) return jsonError('User not found', 404);

    const passwordOk = await verifyPassword(body.password, dbUser.passwordHash);
    if (!passwordOk) return jsonError('Incorrect password', 401);

    if (isEmailConfigured()) {
      if (!body.otp?.trim()) {
        return jsonError('Enter the verification code sent to your email', 400);
      }
      const otpResult = await verifyAccountDeletionOtp(user!.id, body.otp.trim());
      if (!otpResult.ok) return jsonError(otpResult.error, 400);
    }

    const deleted = await purgeUserAccount(user!.id);
    if (!deleted) return jsonError('Account not found', 404);

    await destroySession();
    return jsonOk({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return jsonError('Confirm all requirements before deleting your account', 400);
    }
    logger.error({ route: '/api/account/delete', err: e }, 'Could not delete account');
    return jsonError('Could not delete account', 500);
  }
}
