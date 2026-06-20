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

export function sanitizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}
