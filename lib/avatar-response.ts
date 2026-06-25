import { readFile } from 'fs/promises';
import path from 'path';
import { get } from '@vercel/blob';
import { jsonError } from '@/lib/api-helpers';
import { blobUrlWithoutQuery, isBlobAvatar, isLocalAvatar } from '@/lib/avatar-url';

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

export async function avatarResponseForUrl(avatarUrl: string | null | undefined) {
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
