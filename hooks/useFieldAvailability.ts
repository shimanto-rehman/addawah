'use client';

import { useEffect, useState } from 'react';

export type AvailabilityStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

type FieldResult = {
  valid: boolean;
  available: boolean;
  message: string | null;
};

export function useFieldAvailability(
  field: 'username' | 'email' | 'mobile',
  value: string,
  formatValid: boolean,
  excludeUserId?: string,
) {
  const [status, setStatus] = useState<AvailabilityStatus>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!value) {
      setStatus('idle');
      setMessage('');
      return;
    }

    if (!formatValid) {
      setStatus('invalid');
      setMessage(
        field === 'username'
          ? 'Use 3–30 characters: letters, numbers, periods, underscores'
          : field === 'email'
            ? 'Enter a valid email address'
            : 'Enter a complete phone number',
      );
      return;
    }

    const timer = setTimeout(async () => {
      setStatus('checking');
      try {
        const params = new URLSearchParams({ [field]: value });
        if (excludeUserId) params.set('excludeUserId', excludeUserId);
        const res = await fetch(`/api/auth/check-availability?${params}`);
        const data = await res.json();
        const result = data[field] as FieldResult | undefined;
        if (!result) {
          setStatus('idle');
          setMessage('');
          return;
        }
        if (!result.valid) {
          setStatus('invalid');
          setMessage(result.message || '');
        } else if (result.available) {
          setStatus('available');
          setMessage('');
        } else {
          setStatus('taken');
          setMessage(result.message || 'Already in use');
        }
      } catch {
        setStatus('idle');
        setMessage('');
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [field, value, formatValid, excludeUserId]);

  return {
    status,
    message,
    showTick: status === 'available',
  };
}
