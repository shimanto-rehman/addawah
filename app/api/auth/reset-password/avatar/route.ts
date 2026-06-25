import { NextRequest } from 'next/server';
import { avatarResponseForUrl } from '@/lib/avatar-response';
import { jsonError } from '@/lib/api-helpers';
import { getPasswordResetPreview } from '@/lib/password-reset-service';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')?.trim();
  if (!token) return jsonError('Missing reset token', 400);

  const user = await getPasswordResetPreview(token);
  if (!user) return jsonError('Reset link expired', 401);

  return avatarResponseForUrl(user.avatarUrl);
}
