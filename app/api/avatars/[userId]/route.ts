import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { avatarResponseForUrl } from '@/lib/avatar-response';
import { jsonError } from '@/lib/api-helpers';
import { canView, parseProfilePrivacy, profileViewerFromConnection } from '@/lib/profile-privacy';
import { getConnectionBetween } from '@/lib/friendship';

async function canViewAvatar(targetUserId: string, viewerId: string | null) {
  if (!viewerId) {
    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { profilePrivacy: true },
    });
    if (!target) return false;
    const privacy = parseProfilePrivacy(target.profilePrivacy);
    return privacy.public.showAvatarPhoto;
  }

  if (viewerId === targetUserId) return true;

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { profilePrivacy: true },
  });
  if (!target) return false;

  const privacy = parseProfilePrivacy(target.profilePrivacy);
  const connection = await getConnectionBetween(viewerId, targetUserId);
  const viewerCtx = profileViewerFromConnection(connection.status);
  return canView(privacy, 'showAvatarPhoto', viewerCtx);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const viewer = await getSessionUser();
  const allowed = await canViewAvatar(userId, viewer?.id ?? null);
  if (!allowed) {
    return jsonError('Not allowed', 403);
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarUrl: true },
  });

  return avatarResponseForUrl(target?.avatarUrl);
}
