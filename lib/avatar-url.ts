/** How avatars are resolved for <img src> — private Blob URLs need a same-origin proxy. */

export function isPrivateBlobAvatar(url: string): boolean {
  return url.includes('.private.blob.vercel-storage.com');
}

export function isLocalAvatar(url: string): boolean {
  return url.startsWith('/uploads/');
}

export function isBlobAvatar(url: string): boolean {
  return url.includes('blob.vercel-storage.com');
}

/** Strip ?v= cache busters before Blob SDK calls. */
export function blobUrlWithoutQuery(avatarUrl: string): string {
  return avatarUrl.split('?')[0];
}

function avatarVersion(avatarUrl: string): string {
  try {
    const v = new URL(avatarUrl, 'http://local').searchParams.get('v');
    if (v) return v;
  } catch {
    /* ignore */
  }
  return encodeURIComponent(avatarUrl).slice(-24);
}

export function resolveAvatarSrc(
  userId: string | undefined,
  avatarUrl: string | null | undefined,
): string | null {
  if (!avatarUrl) return null;
  if (userId && (isPrivateBlobAvatar(avatarUrl) || isLocalAvatar(avatarUrl))) {
    return `/api/avatars/${userId}?v=${avatarVersion(avatarUrl)}`;
  }
  return avatarUrl;
}
