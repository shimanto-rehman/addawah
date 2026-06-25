'use client';

import dynamic from 'next/dynamic';
import useSWR from 'swr';
import type { PrayerInsightsPayload } from '@/lib/prayer-insights';
import type { CoachingTip } from '@/lib/analytics-coaching';
import type { PrayerName } from '@/lib/constants';
import type { AnalyticsChartsData } from '@/components/analytics/AnalyticsChartsGrid';
import type { ImanMoodDay } from '@/lib/iman-mood-analytics';

const PrayerInsights = dynamic(
  () => import('@/components/dashboard/PrayerInsights').then((m) => ({ default: m.PrayerInsights })),
  { ssr: false, loading: () => <p className="dawa-analytics__loading">Loading prayer insights…</p> },
);

const AnalyticsChartsGrid = dynamic(
  () => import('@/components/analytics/AnalyticsChartsGrid').then((m) => ({ default: m.AnalyticsChartsGrid })),
  { ssr: false, loading: () => <p className="dawa-analytics__loading">Loading charts…</p> },
);

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type AnalyticsPayload = AnalyticsChartsData & {
  kpis: {
    iman: number;
    streak: number;
    weekRate: number;
    lifetimeRate: number;
    perfectDays: number;
    fajrMissed: number;
    totalCompleted: number;
  };
  insights: PrayerInsightsPayload;
  coaching: CoachingTip[];
  trend: 'up' | 'down' | 'steady';
  imanMoodSeries: ImanMoodDay[];
  imanMoodCorrelation: number | null;
};

const swrOpts = {
  refreshInterval: 300_000,
  revalidateOnFocus: true,
  revalidateIfStale: true,
};

export function AnalyticsHub() {
  const { data, isLoading } = useSWR<AnalyticsPayload>('/api/analytics', fetcher, swrOpts);

  if (isLoading && !data) {
    return <p className="dawa-analytics__loading">Loading your worship analytics…</p>;
  }

  const kpis = data?.kpis;

  const chartsData: AnalyticsChartsData | null = data
    ? {
        insights: data.insights,
        byPrayer: data.byPrayer,
        stackedWeek: data.stackedWeek,
        weekDays: data.weekDays,
        weekLabels: data.weekLabels,
        moodHistory: data.moodHistory,
        imanMoodSeries: data.imanMoodSeries,
        imanMoodCorrelation: data.imanMoodCorrelation,
      }
    : null;

  return (
    <div className="dawa-analytics">
      <section className="dawa-analytics__hero dawa-glass">
        <div className="dawa-analytics__hero-text">
          <p className="dawa-analytics__eyebrow">Your spiritual dashboard</p>
          <h2 className="dawa-analytics__hero-title">Patterns, progress & guidance</h2>
          <p className="dawa-analytics__hero-sub">
            Deep analysis from your logged salahs — use it to pray stronger in wakt.
          </p>
        </div>
        <div className="dawa-analytics__kpis">
          {[
            { val: kpis?.iman ?? '—', unit: '%', label: 'Iman meter' },
            { val: kpis?.streak ?? '—', unit: '', label: 'Day streak' },
            { val: kpis?.weekRate ?? '—', unit: '%', label: 'This week' },
            { val: kpis?.lifetimeRate ?? '—', unit: '%', label: 'Lifetime' },
          ].map((k) => (
            <div key={k.label} className="dawa-analytics__kpi">
              <span className="dawa-analytics__kpi-val">
                <span className="dawa-num">{k.val}</span>{k.unit && <small>{k.unit}</small>}
              </span>
              <span className="dawa-analytics__kpi-label">{k.label}</span>
            </div>
          ))}
        </div>
      </section>

      {(data?.coaching?.length ?? 0) > 0 && (
        <section className="dawa-analytics__coaching">
          <h2 className="dawa-analytics__section-title">Personal guidance</h2>
          <p className="dawa-analytics__section-sub">Actionable insights based on your recent salah patterns</p>
          <ul className="dawa-analytics__tips">
            {data!.coaching.map((tip) => (
              <li
                key={tip.id}
                className={`dawa-analytics__tip dawa-analytics__tip--${tip.priority} dawa-glass`}
              >
                <span className="dawa-analytics__tip-icon">{tip.icon}</span>
                <div>
                  <p className="dawa-analytics__tip-title">{tip.title}</p>
                  <p className="dawa-analytics__tip-body">{tip.body}</p>
                  <p className="dawa-analytics__tip-action">→ {tip.action}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="dawa-analytics__insights-wrap">
        <PrayerInsights />
      </div>

      {chartsData && <AnalyticsChartsGrid data={chartsData} />}
    </div>
  );
}
