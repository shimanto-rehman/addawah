'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { formatWaktDate, getWaktCountdownState } from '@/lib/wakt-countdown';
import {
  isPrayerTimesPayload,
  prayerTimesFetcher,
  type PrayerTimesPayload,
} from '@/lib/prayer-times';
import { splitCountdownHms } from '@/lib/wakt-display';

const fetcher = prayerTimesFetcher;

type WaktCountdownClockProps = {
  className?: string;
  variant?: 'default' | 'greet';
};

export function WaktCountdownClock({ className = '', variant = 'default' }: WaktCountdownClockProps) {
  const { data } = useSWR<PrayerTimesPayload>('/api/prayer-times', fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 1_800_000,
  });
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const state = useMemo(
    () => (isPrayerTimesPayload(data) ? getWaktCountdownState(data, now) : null),
    [data, now],
  );

  const { h, m, s } = splitCountdownHms(state?.remainingSeconds ?? 0);
  const isLowTime = state?.mode === 'active' && (state?.remainingSeconds ?? 0) <= 5 * 60;
  const dateLabel = formatWaktDate(now, state?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);

  const variantClass = variant === 'greet' ? ' dawa-clock--greet' : '';
  const dangerClass = isLowTime ? ' dawa-clock__digits--danger' : '';

  return (
    <div className={`dawa-clock dawa-clock--wakt${variantClass}${className ? ` ${className}` : ''}`}>
      <div className={`dawa-clock__digits${dangerClass}`} aria-hidden>
        <span className="dawa-clock__part">{state ? h : '–'}</span>
        <span className="dawa-clock__sep">:</span>
        <span className="dawa-clock__part">{state ? m : '–'}</span>
        <span className="dawa-clock__sep">:</span>
        <span className="dawa-clock__part dawa-clock__part--sec">{state ? s : '–'}</span>
        {state && (
          <span className="dawa-clock__wakt-badge">{state.prayerLabel}</span>
        )}
      </div>
      <span className="dawa-clock__sr">
        {state
          ? `${h}:${m}:${s} ${state.mode === 'active' ? 'left in' : 'until'} ${state.prayerLabel} wakt, ${dateLabel}`
          : `Loading wakt countdown, ${dateLabel}`}
      </span>
      <span className="dawa-clock__date">{dateLabel}</span>
    </div>
  );
}
