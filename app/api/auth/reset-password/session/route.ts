import { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api-helpers';
import { getPasswordResetPreview } from '@/lib/password-reset-service';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')?.trim();
  if (!token) return jsonError('Missing reset token', 400);

  const user = await getPasswordResetPreview(token);
  if (!user) return jsonError('Reset link expired — request a new code', 401);

  return jsonOk({
    user: {
      name: user.name,
      username: user.username,
      avatarColor: user.avatarColor,
      avatarUrl: user.avatarUrl,
    },
  });
}
