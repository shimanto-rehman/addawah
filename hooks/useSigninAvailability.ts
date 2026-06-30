'use client';

import { useEffect, useState } from 'react';

export type SigninAvailabilityStatus = 'idle' | 'checking' | 'found' | 'not-found' | 'invalid';

type IdentifierResult = {
  valid: boolean;
  exists: boolean;
  message: string | null;
};

/**
 * Hook for sign-in field availability.
 * Unlike registration (where "taken" = bad), here "exists" = good (green tick).
 *
 * Checks if the email/username exists in the database via /api/auth/check-availability?identifier=...
 * Uses Redis caching on the server for fast responses.
 */
export function useSigninAvailability(value: string) {
  const [status, setStatus] = useState<SigninAvailabilityStatus>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const trimmed = value.trim();

    if (!trimmed) {
      setStatus('idle');
      setMessage('');
      return;
    }

    // Determine if email or username
    const isEmail = trimmed.includes('@');

    // Basic format validation before hitting the API
    if (isEmail) {
      // Simple email format check
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        setStatus('invalid');
        setMessage('Enter a valid email address');
        return;
      }
    } else {
      // Username: min 3 chars, valid chars
      if (trimmed.length < 3) {
        setStatus('idle');
        setMessage('');
        return;
      }
      if (!/^[a-zA-Z0-9._]+$/.test(trimmed)) {
        setStatus('invalid');
        setMessage('Use letters, numbers, periods, underscores');
        return;
      }
    }

    const timer = setTimeout(async () => {
      setStatus('checking');
      try {
        const res = await fetch(`/api/auth/check-availability?identifier=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        const result = data.identifier as IdentifierResult | undefined;

        if (!result) {
          setStatus('idle');
          setMessage('');
          return;
        }

        if (!result.valid) {
          setStatus('invalid');
          setMessage(result.message || 'Invalid input');
        } else if (result.exists) {
          setStatus('found');
          setMessage('');
        } else {
          setStatus('not-found');
          setMessage(result.message || 'Account not found');
        }
      } catch {
        setStatus('idle');
        setMessage('');
      }
    }, 300); // 300ms debounce — fast like modern social media

    return () => clearTimeout(timer);
  }, [value]);

  return {
    status,
    message,
    showTick: status === 'found',
    showCross: status === 'invalid' || status === 'not-found',
    hint: status === 'invalid' || status === 'not-found' ? message : undefined,
    hintVariant: (status === 'invalid' || status === 'not-found' ? 'error' : 'info') as 'info' | 'error',
  };
}
