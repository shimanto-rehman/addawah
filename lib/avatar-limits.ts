export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export const MAX_AVATAR_LABEL = '2MB';

export const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export function validateAvatarFile(file: File): string | null {
  const mime =
    ALLOWED_AVATAR_TYPES.includes(file.type as (typeof ALLOWED_AVATAR_TYPES)[number])
      ? file.type
      : null;
  const allowed =
    mime ??
    (['.jpg', '.jpeg', '.png', '.webp'].some((ext) => file.name.toLowerCase().endsWith(ext))
      ? file.type || 'image/jpeg'
      : null);

  if (!allowed) {
    return 'Use a JPG, PNG, or WebP image';
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return `Image must be ${MAX_AVATAR_LABEL} or smaller`;
  }
  return null;
}
