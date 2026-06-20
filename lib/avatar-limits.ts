export const MAX_AVATAR_BYTES = 100 * 1024;

export const MAX_AVATAR_LABEL = '100KB';

export const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export function validateAvatarFile(file: File): string | null {
  if (!ALLOWED_AVATAR_TYPES.includes(file.type as (typeof ALLOWED_AVATAR_TYPES)[number])) {
    return 'Use a JPG, PNG, or WebP image';
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return `Image must be ${MAX_AVATAR_LABEL} or smaller`;
  }
  return null;
}
