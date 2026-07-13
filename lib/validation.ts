import { z } from 'zod';

export function sanitizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return z.string().email().safeParse(email).success;
}

export function sanitizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9._]/g, '');
}

export function validateUsername(username: string): { valid: boolean; message?: string } {
  if (username.length < 3) {
    return { valid: false, message: 'Username must be at least 3 characters' };
  }
  if (username.length > 30) {
    return { valid: false, message: 'Username must be 30 characters or less' };
  }
  if (/\.\./.test(username)) {
    return { valid: false, message: 'Username cannot contain consecutive periods' };
  }
  if (!/^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$/.test(username)) {
    return { valid: false, message: 'Letters, numbers, periods, and underscores only' };
  }
  return { valid: true };
}

/** Trim + collapse whitespace (final normalize before save/send). */
export function sanitizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

/**
 * Live name input: letters (incl. Unicode), spaces, hyphens, apostrophes, periods.
 * Digits and other symbols are stripped as the user types.
 */
export function sanitizeNameInput(raw: string): string {
  return raw.replace(/[^\p{L}\s'.-]/gu, '').replace(/\s{2,}/g, ' ');
}

/** True when name is 2–80 chars, has a letter, and no digits. */
export function isValidName(name: string): boolean {
  const n = sanitizeName(name);
  if (n.length < 2 || n.length > 80) return false;
  if (/\d/.test(n)) return false;
  if (!/\p{L}/u.test(n)) return false;
  return /^[\p{L}\s'.-]+$/u.test(n);
}
