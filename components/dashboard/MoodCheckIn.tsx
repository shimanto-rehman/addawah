'use client';

import { useCallback, useState, type CSSProperties } from 'react';
import useSWR from 'swr';
import { MoodIcon } from '@/components/dashboard/MoodIcon';
import { MOOD_OPTIONS } from '@/lib/moods';
import { revalidateMoodAnalytics } from '@/lib/swr-revalidate';
import { useMidnightRefresh } from '@/lib/use-midnight-refresh';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function MoodCheckIn() {
  const { data, mutate } = useSWR<{
    today: { moodId: string; label: string; date?: string } | null;
  }>('/api/mood', fetcher, { revalidateOnFocus: true });

  const [saving, setSaving] = useState<string | null>(null);
  const selected = data?.today?.moodId ?? null;

  const refreshMood = useCallback(() => {
    mutate();
  }, [mutate]);

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
      await mutate(json, { revalidate: false });
      await revalidateMoodAnalytics();
    } catch {
      await mutate();
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
