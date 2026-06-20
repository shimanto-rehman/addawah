'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { MoodIcon } from '@/components/dashboard/MoodIcon';
import { MOOD_OPTIONS } from '@/lib/moods';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function MoodCheckIn() {
  const { data, mutate } = useSWR<{
    today: { moodId: string; label: string } | null;
  }>('/api/mood', fetcher, { revalidateOnFocus: false });

  const [saving, setSaving] = useState<string | null>(null);
  const selected = data?.today?.moodId ?? null;

  async function pick(moodId: string) {
    setSaving(moodId);
    await fetch('/api/mood', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moodId }),
    });
    setSaving(null);
    mutate();
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
              title={m.label}
              aria-label={m.label}
              aria-pressed={selected === m.id}
              disabled={saving !== null}
              onClick={() => pick(m.id)}
            >
              <MoodIcon
                variant={m.variant}
                color={m.color}
                size={34}
                className="dawa-mood__icon"
              />
              <span className="dawa-mood__label">{m.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
