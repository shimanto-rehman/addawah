'use client';

import useSWR from 'swr';
import { useDashboardData } from '@/components/dashboard/DashboardDataProvider';
import { STATS_KEY } from '@/lib/swr-revalidate';
import { swrFetcher } from '@/lib/swr-fetcher';
import type { StatsPayload } from '@/lib/stats-data';

const BEADS = 33;

type Stats = StatsPayload;

function fmt(n: number | undefined) {
  return n === undefined ? '—' : n.toLocaleString();
}

function MetricShimmer({ className }: { className: string }) {
  return <span className={`dawa-metrics__shimmer ${className}`} aria-hidden />;
}

export function HeroStats() {
  const ctx = useDashboardData();
  const hubStats = ctx?.data?.stats;
  const shouldFetchStats = ctx === null || (!hubStats && !ctx.isLoading);

  const { data: remote } = useSWR<Stats>(
    shouldFetchStats ? STATS_KEY : null,
    swrFetcher,
    {
      refreshInterval: 60_000,
      revalidateOnFocus: false,
      revalidateIfStale: true,
    },
  );

  const data = hubStats ?? remote;
  const isLoading = !data;

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
    { value: data ? `${data.todayCompleted}/5` : '', label: 'today' },
  ];

  return (
    <section
      className={`dawa-metrics${isLoading ? ' dawa-metrics--loading' : ''}`}
      aria-label="Prayer journey statistics"
      aria-busy={isLoading}
    >
      {isLoading && <span className="sr-only">Loading prayer statistics</span>}
      <div className="dawa-metrics__lead">
        {isLoading ? (
          <MetricShimmer className="dawa-metrics__shimmer--hero" />
        ) : (
          <span className="dawa-metrics__hero dawa-num">{fmt(data?.lifetimeMissed)}</span>
        )}
        <p className="dawa-metrics__headline">
          fard missed
          <span className="dawa-metrics__headline-sub">
            {isLoading ? (
              <MetricShimmer className="dawa-metrics__shimmer--sub" />
            ) : (
              <>
                <span className="dawa-num">{data.lifetimeRate}%</span> completion ·{' '}
                <span className="dawa-num">{data.daysOnApp}</span> days since you started tracking
              </>
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
            <span className="dawa-metrics__stream-val dawa-num">
              {isLoading ? (
                <MetricShimmer className="dawa-metrics__shimmer--stream" />
              ) : (
                item.value
              )}
            </span>
            {item.label}
          </li>
        ))}
      </ul>

      <div
        className={`dawa-metrics__beads${isLoading ? ' dawa-metrics__beads--loading' : ''}`}
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
          <span>
            {isLoading ? (
              <MetricShimmer className="dawa-metrics__shimmer--pct" />
            ) : (
              <span className="dawa-num">{data.lifetimeRate}%</span>
            )}
          </span>
        </div>
        <div
          className={`dawa-metrics__bar${isLoading ? ' dawa-metrics__bar--loading' : ''}`}
          role="progressbar"
          aria-valuenow={data?.lifetimeRate ?? 0}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Lifetime fard prayed since you started tracking"
        >
          {!isLoading && (
            <span
              className="dawa-metrics__bar-prayed"
              style={{ width: `${prayedShare}%` }}
            />
          )}
        </div>
        <div className="dawa-metrics__progress-foot">
          <span>
            {isLoading ? (
              <MetricShimmer className="dawa-metrics__shimmer--foot" />
            ) : (
              <>
                <span className="dawa-num">{fmt(data.lifetimeMissed)}</span> missed
              </>
            )}
          </span>
          <span>
            This week{' '}
            {isLoading ? (
              <MetricShimmer className="dawa-metrics__shimmer--foot" />
            ) : (
              <>
                <span className="dawa-num">{data.weekCompleted}/{data.weekTotal}</span>
                {' · '}
                <span className="dawa-num">{weekPct}%</span>
              </>
            )}
          </span>
          <span>
            {isLoading ? (
              <MetricShimmer className="dawa-metrics__shimmer--foot" />
            ) : (
              <>
                <span className="dawa-num">{fmt(data.lifetimePrayed)}</span> prayed
              </>
            )}
          </span>
        </div>
      </div>

      <p className="dawa-metrics__meta">
        {isLoading ? (
          <MetricShimmer className="dawa-metrics__shimmer--meta" />
        ) : (
          <>
            {data.bestPrayer ? (
              <>
                Strongest {data.bestPrayer.label} at{' '}
                <span className="dawa-num">{data.bestPrayer.rate}%</span>
              </>
            ) : (
              'Log prayers to unlock insights'
            )}
            {' · '}
            <span className="dawa-num">{data.activeDays}</span> active days
          </>
        )}
      </p>

      {!isLoading && data.missedBreakdown?.length > 0 && (
        <details className="dawa-metrics__missed">
          <summary className="dawa-metrics__missed-summary">
            Which wakts are counted as missed?
          </summary>
          <p className="dawa-metrics__missed-note">
            Tracking since{' '}
            <span className="dawa-num">{data.trackingSince}</span>
            {' · '}
            Today&apos;s in-progress wakts are excluded until their window ends.
          </p>
          <ul className="dawa-metrics__missed-list">
            {data.missedBreakdown.map((slot) => (
              <li key={`${slot.date}-${slot.prayer}`}>
                <span className="dawa-num">{slot.date}</span>
                {' — '}
                {slot.label}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
