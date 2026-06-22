import { readFile } from 'fs/promises';
import path from 'path';
import { get } from '@vercel/blob';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isBlobAvatar, isLocalAvatar, blobUrlWithoutQuery } from '@/lib/avatar-url';
import { jsonError } from '@/lib/api-helpers';
import { canView, parseProfilePrivacy, profileViewerFromConnection } from '@/lib/profile-privacy';
import { getConnectionBetween } from '@/lib/friendship';

const MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

function localMime(filePath: string) {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  return MIME[ext] ?? 'application/octet-stream';
}

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

  const avatarUrl = target?.avatarUrl;
  if (!avatarUrl) {
    return jsonError('No avatar', 404);
  }

  if (isLocalAvatar(avatarUrl)) {
    const base = avatarUrl.split('?')[0];
    const filePath = path.join(process.cwd(), 'public', base.replace(/^\//, ''));
    try {
      const buffer = await readFile(filePath);
      return new Response(buffer, {
        headers: {
          'Content-Type': localMime(filePath),
          'Cache-Control': 'private, max-age=60',
        },
      });
    } catch {
      return jsonError('Avatar file missing', 404);
    }
  }

  if (isBlobAvatar(avatarUrl)) {
    const access = avatarUrl.includes('.private.blob.vercel-storage.com') ? 'private' : 'public';
    const result = await get(blobUrlWithoutQuery(avatarUrl), {
      access,
      ...(process.env.BLOB_READ_WRITE_TOKEN
        ? { token: process.env.BLOB_READ_WRITE_TOKEN }
        : {}),
    });

    if (!result || result.statusCode !== 200 || !result.stream) {
      return jsonError('Avatar not found', 404);
    }

    return new Response(result.stream, {
      headers: {
        'Content-Type': result.blob.contentType ?? 'image/jpeg',
        'Cache-Control': 'private, max-age=60',
      },
    });
  }

  return Response.redirect(avatarUrl, 302);
}
