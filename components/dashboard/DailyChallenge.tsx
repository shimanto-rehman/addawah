'use client';

import { useCallback, useState } from 'react';
import useSWR from 'swr';
import { useDashboardData } from '@/components/dashboard/DashboardDataProvider';
import type { ChallengeTaskState, DailyChallengeState } from '@/lib/challenge-data';
import { CHALLENGE_KEY } from '@/lib/swr-revalidate';
import { useMidnightRefresh } from '@/lib/use-midnight-refresh';
import { swrFetcher } from '@/lib/swr-fetcher';
import { Shimmer } from '@/components/ui/Shimmer';

export function DailyChallenge() {
  const dashboard = useDashboardData();
  const useRemote = !dashboard;
  const { data: remote, mutate: remoteMutate } = useSWR<DailyChallengeState>(
    useRemote ? CHALLENGE_KEY : null,
    swrFetcher,
    { revalidateOnFocus: false },
  );

  const data = dashboard?.data?.challenge ?? remote;
  const isLoading = dashboard ? dashboard.isLoading && !data : !data && useRemote;
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
      const next = (await res.json()) as DailyChallengeState;
      if (dashboard) {
        await dashboard.mutate(
          (current) => (current ? { ...current, challenge: next } : current),
          { revalidate: false },
        );
      } else {
        await remoteMutate(next, { revalidate: false });
      }
    } catch {
      if (dashboard) await dashboard.mutate();
      else await remoteMutate();
    } finally {
      setSaving(null);
    }
  }

  const tasks: ChallengeTaskState[] = data?.tasks ?? [];
  const completed = data?.completed ?? 0;
  const total = data?.total ?? Math.max(tasks.length, 5);
  const allDone = completed === total && total > 0;
  /** Visual segments between title and count — denser rainbow track */
  const SEGMENTS = 14;
  const litCount = total > 0 ? Math.round((completed / total) * SEGMENTS) : 0;

  if (isLoading && !data) {
    return (
      <section className="dawa-challenge" aria-label="Daily Muslim challenge" aria-busy="true">
        <div className="dawa-challenge__head">
          <Shimmer variant="text" width="140px" height="18px" />
          <div className="dawa-challenge__meter" aria-hidden>
            {Array.from({ length: 14 }, (_, i) => (
              <span key={i} className="dawa-challenge__seg" />
            ))}
          </div>
          <Shimmer variant="text-sm" width="28px" />
        </div>
        <ul className="dawa-challenge__list">
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i} className="dawa-challenge__skel-row">
              <Shimmer variant="circle" width="18px" height="18px" />
              <Shimmer variant="text" width={i % 2 ? '70%' : '55%'} />
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section className={`dawa-challenge${allDone ? ' is-complete' : ''}`} aria-label="Daily Muslim challenge">
      <header className="dawa-challenge__head">
        <h3 className="dawa-challenge__title">Today&apos;s challenge</h3>
        <div
          className="dawa-challenge__meter"
          role="img"
          aria-label={`${completed} of ${total} complete`}
        >
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <span
              key={i}
              className={`dawa-challenge__seg${i < litCount ? ' is-lit' : ''}`}
            />
          ))}
        </div>
        <span className="dawa-challenge__count">
          <span className="dawa-num">{completed}</span>/{total}
        </span>
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
              <span className={`dawa-challenge__check${t.done ? ' is-checked' : ''}`} aria-hidden>
                {t.done && (
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none">
                    <path
                      d="M5 12.5l4.5 4.5L19 7"
                      stroke="currentColor"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              <span className="dawa-challenge__body">
                <span className="dawa-challenge__task">{t.title}</span>
                {!t.done && <span className="dawa-challenge__hint">{t.subtitle}</span>}
                {t.done && <span className="dawa-challenge__hadith">{t.hadith}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
