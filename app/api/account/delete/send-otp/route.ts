import { apiRequireAuth, jsonError, jsonOk } from '@/lib/api-helpers';
import { sendAccountDeletionOtp } from '@/lib/account-deletion-service';
import { isEmailConfigured } from '@/lib/email';

export async function POST() {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  if (!isEmailConfigured()) {
    return jsonError('Email verification is not available', 503);
  }

  const result = await sendAccountDeletionOtp(user!.id);
  if (!result.ok) return jsonError(result.error, 400);

  return jsonOk({ ok: true, message: 'Verification code sent to your email' });
}
