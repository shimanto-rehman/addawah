'use client';

import { useCallback, useState } from 'react';
import useSWR from 'swr';
import { useDashboardData } from '@/components/dashboard/DashboardDataProvider';
import type { ChallengeTaskState, DailyChallengeState } from '@/lib/challenge-data';
import { CHALLENGE_KEY } from '@/lib/swr-revalidate';
import { useMidnightRefresh } from '@/lib/use-midnight-refresh';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function DailyChallenge() {
  const dashboard = useDashboardData();
  const useRemote = !dashboard;
  const { data: remote, mutate: remoteMutate } = useSWR<DailyChallengeState>(
    useRemote ? CHALLENGE_KEY : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const data = dashboard?.data?.challenge ?? remote;

  const [saving, setSaving] = useState<number | null>(null);

  const refresh = useCallback(() => {
    if (dashboard) void dashboard.mutate();
    else void remoteMutate();
  }, [dashboard, remoteMutate]);

  useMidnightRefresh(refresh);

  async function toggle(taskIndex: number) {
    if (!data || saving !== null) return;
    setSaving(taskIndex);
    const prev = data;

    // Optimistic: flip the task locally.
    const optimistic: DailyChallengeState = {
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.index === taskIndex ? { ...t, done: !t.done } : t,
      ),
      completed: prev.tasks[taskIndex].done ? prev.completed - 1 : prev.completed + 1,
    };
    if (dashboard) {
      void dashboard.mutate(
        (current) => (current ? { ...current, challenge: optimistic } : current),
        { revalidate: false },
      );
    } else {
      void remoteMutate(optimistic, { revalidate: false });
    }

    try {
      const res = await fetch('/api/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIndex }),
      });
      if (!res.ok) throw new Error('Failed to toggle challenge task');
      const next: DailyChallengeState = await res.json().then((j) => j.data);
      if (dashboard) {
        await dashboard.mutate(
          (current) => (current ? { ...current, challenge: next } : current),
          { revalidate: false },
        );
      } else {
        await remoteMutate(next, { revalidate: false });
      }
    } catch {
      // Revert on failure.
      if (dashboard) await dashboard.mutate();
      else await remoteMutate();
    } finally {
      setSaving(null);
    }
  }

  const tasks: ChallengeTaskState[] = data?.tasks ?? [];
  const completed = data?.completed ?? 0;
  const total = data?.total ?? tasks.length;
  const allDone = completed === total && total > 0;
  const consistency = data?.consistency ?? 0;
  const consistencyPct = Math.round(consistency * 100);

  return (
    <section className="dawa-challenge" aria-label="Daily Muslim challenge">
      <header className="dawa-challenge__head">
        <div>
          <p className="dawa-challenge__eyebrow">Today&apos;s challenge</p>
          <h3 className="dawa-challenge__title">
            {allDone ? 'Masha\u2019Allah — all five done' : `${completed} of ${total} small deeds`}
          </h3>
        </div>
        {data && (
          <span
            className={`dawa-challenge__streak${consistencyPct >= 70 ? ' is-strong' : ''}`}
            title="7-day completion rate"
          >
            {consistencyPct}%
          </span>
        )}
      </header>

      <ul className="dawa-challenge__list">
        {tasks.map((t) => (
          <li key={t.index}>
            <button
              type="button"
              className={`dawa-challenge__row${t.done ? ' is-done' : ''}`}
              aria-pressed={t.done}
              disabled={saving !== null && saving !== t.index}
              onClick={() => toggle(t.index)}
            >
              <span className="dawa-challenge__emoji" aria-hidden>
                {t.emoji}
              </span>
              <span className="dawa-challenge__body">
                <span className="dawa-challenge__task-title">{t.title}</span>
                <span className="dawa-challenge__subtitle">{t.subtitle}</span>
              </span>
              <span className={`dawa-challenge__check${t.done ? ' is-checked' : ''}`} aria-hidden>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                  <path
                    d="M5 12.5l4.5 4.5L19 7"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </button>
            {t.done && (
              <p className="dawa-challenge__hadith">{t.hadith}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
