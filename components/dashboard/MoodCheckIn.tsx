'use client';

import { useCallback, useState, type CSSProperties } from 'react';
import useSWR from 'swr';
import { MoodIcon } from '@/components/dashboard/MoodIcon';
import { useDashboardData } from '@/components/dashboard/DashboardDataProvider';
import { MOOD_OPTIONS } from '@/lib/moods';
import { revalidateMoodAnalytics, MOOD_KEY } from '@/lib/swr-revalidate';
import { useMidnightRefresh } from '@/lib/use-midnight-refresh';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function MoodCheckIn() {
  const dashboard = useDashboardData();
  const useRemote = !dashboard;
  const { data: remote, mutate: remoteMutate } = useSWR<{
    today: { moodId: string; label: string; date?: string } | null;
  }>(useRemote ? MOOD_KEY : null, fetcher, { revalidateOnFocus: false });

  const data = dashboard?.data?.mood ?? remote;

  const [saving, setSaving] = useState<string | null>(null);
  const selected = data?.today?.moodId ?? null;

  const refreshMood = useCallback(() => {
    if (dashboard) void dashboard.mutate();
    else void remoteMutate();
  }, [dashboard, remoteMutate]);

  useMidnightRefresh(refreshMood);

  async function pick(moodId: string) {
    setSaving(moodId);
    try {
      const res = await fetch('/api/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moodId }),
      });
      if (!res.ok) throw new Error('Failed to save mood');
      const json = await res.json();
      if (dashboard) {
        await dashboard.mutate(
          (current) => (current ? { ...current, mood: json } : current),
          { revalidate: false },
        );
      } else {
        await remoteMutate(json, { revalidate: false });
      }
      await revalidateMoodAnalytics();
    } catch {
      if (dashboard) await dashboard.mutate();
      else await remoteMutate();
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="dawa-mood" aria-label="Daily mood check-in">
      <p className="dawa-mood__question">How are you feeling today?</p>
      <ul className="dawa-mood__row">
        {MOOD_OPTIONS.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              className={`dawa-mood__btn${selected === m.id ? ' is-selected' : ''}`}
              style={{ '--mood-color': m.color } as CSSProperties}
              title={m.label}
              aria-label={m.label}
              aria-pressed={selected === m.id}
              disabled={saving !== null}
              onClick={() => pick(m.id)}
            >
              <span className="dawa-mood__icon-wrap">
                <MoodIcon
                  variant={m.variant}
                  color={m.color}
                  size={34}
                  className="dawa-mood__icon"
                />
              </span>
              <span className="dawa-mood__label">{m.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
