'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SessionUser } from '@/lib/auth';

type LocationPromptProps = {
  user: Pick<SessionUser, 'latitude' | 'longitude' | 'city' | 'country'>;
  /**
   * Dismissal persistence key. When set, dismissal is remembered in
   * localStorage so the prompt only resurfaces if the key changes
   * (e.g. bumped after a release so users see it once more).
   */
  dismissKey?: string;
};

function hasLocation(user: LocationPromptProps['user']): boolean {
  if (typeof user.latitude === 'number' && typeof user.longitude === 'number') return true;
  const city = user.city?.trim();
  const country = user.country?.trim();
  return Boolean(city && country);
}

/**
 * Dashboard / onboarding prompt shown when the user has no location set.
 * Dismissible; the dismissal is remembered per `dismissKey`.
 */
export function LocationPrompt({ user, dismissKey = 'v1' }: LocationPromptProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(true);

  // Read dismissal flag on the client only — keeps SSR output stable and
  // avoids a hydration flash of the prompt for users who already dismissed it.
  useEffect(() => {
    if (hasLocation(user)) return;
    try {
      setDismissed(localStorage.getItem(`location-prompt-dismissed:${dismissKey}`) === '1');
    } catch {
      setDismissed(false);
    }
  }, [user, dismissKey]);

  if (hasLocation(user) || dismissed) return null;

  return (
    <aside className="dawa-location-prompt" role="status">
      <span className="dawa-location-prompt__icon" aria-hidden>
        {/* compass / location pin */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="2" />
        </svg>
      </span>
      <div className="dawa-location-prompt__text">
        <p className="dawa-location-prompt__title">Set your location</p>
        <p className="dawa-location-prompt__sub">
          Accurate prayer times, wakt windows, and reminders need your city or coordinates.
        </p>
      </div>
      <button
        type="button"
        className="dawa-btn dawa-btn--primary"
        onClick={() => router.push('/profile?focus=location')}
      >
        Set location
      </button>
      <button
        type="button"
        className="dawa-location-prompt__close"
        aria-label="Dismiss"
        onClick={() => {
          setDismissed(true);
          try {
            localStorage.setItem(`location-prompt-dismissed:${dismissKey}`, '1');
          } catch {
            /* ignore quota / privacy-mode failures */
          }
        }}
      >
        ×
      </button>
    </aside>
  );
}
