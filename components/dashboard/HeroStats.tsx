'use client';

import useSWR from 'swr';
import type { PrayerName } from '@/lib/constants';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const BEADS = 33;

type Stats = {
  weekCompleted: number;
  weekTotal: number;
  streak: number;
  lifetimeRate: number;
  todayCompleted: number;
  lifetimePrayed: number;
  lifetimeMissed: number;
  lifetimeExpected: number;
  activeDays: number;
  perfectDays: number;
  daysOnApp: number;
  fajrMissed: number;
  bestPrayer: { prayer: PrayerName; label: string; rate: number } | null;
};

function fmt(n: number | undefined) {
  return n === undefined ? '—' : n.toLocaleString();
}

export function HeroStats() {
  const { data } = useSWR<Stats>('/api/stats', fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: true,
    revalidateIfStale: true,
  });

  const weekPct = data ? Math.round((data.weekCompleted / data.weekTotal) * 100) : 0;
  const expected = data?.lifetimeExpected ?? 0;
  const missedCount = data?.lifetimeMissed ?? 0;
  const missedBeads = data ? Math.min(BEADS, missedCount) : 0;
  const prayedShare = data?.lifetimeRate ?? 0;

  const stream = [
    { value: fmt(data?.lifetimePrayed), label: 'fard prayers prayed · since tracking' },
    { value: fmt(data?.streak), label: 'day streak' },
    { value: fmt(data?.fajrMissed), label: 'fajr missed' },
    { value: fmt(data?.perfectDays), label: 'perfect days' },
    { value: data ? `${data.todayCompleted}/5` : '—', label: 'today' },
  ];

  return (
    <section
      className="dawa-metrics"
      aria-label="Prayer journey statistics"
    >
      <div className="dawa-metrics__lead">
        <span className="dawa-metrics__hero dawa-num">{fmt(data?.lifetimeMissed)}</span>
        <p className="dawa-metrics__headline">
          fard missed
          <span className="dawa-metrics__headline-sub">
            {data ? (
              <>
                <span className="dawa-num">{data.lifetimeRate}%</span> completion ·{' '}
                <span className="dawa-num">{data.daysOnApp}</span> days since you started tracking
              </>
            ) : (
              'Loading your journey…'
            )}
          </span>
        </p>
      </div>

      <ul className="dawa-metrics__stream">
        {stream.map((item) => (
          <li
            key={item.label}
            className="dawa-metrics__stream-item"
          >
            <span className="dawa-metrics__stream-val dawa-num">{item.value}</span>
            {item.label}
          </li>
        ))}
      </ul>

      <div
        className="dawa-metrics__beads"
        role="img"
        aria-label={
          data
            ? `${fmt(data.lifetimeMissed)} missed fard of ${fmt(expected)} in your journey`
            : 'Missed fard prayers'
        }
      >
        {Array.from({ length: BEADS }, (_, i) => (
          <span
            key={i}
            className={`dawa-metrics__bead${i < missedBeads ? ' is-missed' : ''}`}
          />
        ))}
      </div>

      <div className="dawa-metrics__progress">
        <div className="dawa-metrics__progress-head">
          <span>Lifetime</span>
          <span>{data ? <span className="dawa-num">{data.lifetimeRate}%</span> : '—'}</span>
        </div>
        <div
          className="dawa-metrics__bar"
          role="progressbar"
          aria-valuenow={data?.lifetimeRate ?? 0}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Lifetime fard prayed since you started tracking"
        >
          <span
            className="dawa-metrics__bar-prayed"
            style={{ width: `${prayedShare}%` }}
          />
        </div>
        <div className="dawa-metrics__progress-foot">
          <span>
            {data ? (
              <>
                <span className="dawa-num">{fmt(data.lifetimeMissed)}</span> missed
              </>
            ) : (
              '—'
            )}
          </span>
          <span>
            This week{' '}
            {data ? (
              <>
                <span className="dawa-num">{data.weekCompleted}/{data.weekTotal}</span>
                {' · '}
                <span className="dawa-num">{weekPct}%</span>
              </>
            ) : (
              '—'
            )}
          </span>
          <span>
            {data ? (
              <>
                <span className="dawa-num">{fmt(data.lifetimePrayed)}</span> prayed
              </>
            ) : (
              '—'
            )}
          </span>
        </div>
      </div>

      <p className="dawa-metrics__meta">
        {data?.bestPrayer ? (
          <>
            Strongest {data.bestPrayer.label} at{' '}
            <span className="dawa-num">{data.bestPrayer.rate}%</span>
          </>
        ) : (
          'Log prayers to unlock insights'
        )}
        {data ? (
          <>
            {' · '}
            <span className="dawa-num">{data.activeDays}</span> active days
          </>
        ) : null}
      </p>
    </section>
  );
}
