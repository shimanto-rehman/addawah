'use client';

import dynamic from 'next/dynamic';
import useSWR from 'swr';
import type { PrayerInsightsPayload } from '@/lib/prayer-insights';
import type { CoachingTip } from '@/lib/analytics-coaching';
import type { PrayerName } from '@/lib/constants';
import type { AnalyticsChartsData } from '@/components/analytics/AnalyticsChartsGrid';
import type { ImanMoodDay } from '@/lib/iman-mood-analytics';
import type { AnalyticsKpis } from '@/lib/analytics-data';
import { Shimmer, ChartShimmer } from '@/components/ui/Shimmer';

const PrayerInsights = dynamic(
  () => import('@/components/dashboard/PrayerInsights').then((m) => ({ default: m.PrayerInsights })),
  { ssr: false, loading: () => <ChartShimmer height="300px" /> },
);

const AnalyticsChartsGrid = dynamic(
  () => import('@/components/analytics/AnalyticsChartsGrid').then((m) => ({ default: m.AnalyticsChartsGrid })),
  { ssr: false, loading: () => <ChartShimmer height="400px" /> },
);

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type AnalyticsPayload = AnalyticsChartsData & {
  kpis: AnalyticsKpis;
  insights: PrayerInsightsPayload;
  coaching: CoachingTip[];
  trend: 'up' | 'down' | 'steady';
  imanMoodSeries: ImanMoodDay[];
  imanMoodCorrelation: number | null;
};

type AnalyticsSummary = {
  kpis: AnalyticsKpis;
  coaching: CoachingTip[];
  totals: PrayerInsightsPayload['totals'];
  trend: PrayerInsightsPayload['trend'];
  revision: string;
};

const swrOpts = {
  refreshInterval: 300_000,
  revalidateOnFocus: false,
  revalidateIfStale: true,
};

function KpiSkeleton() {
  return (
    <div className="dawa-analytics__kpi dawa-analytics__kpi--skeleton" aria-hidden>
      <span className="dawa-analytics__kpi-val dawa-analytics__kpi-val--skeleton" />
      <span className="dawa-analytics__kpi-label dawa-analytics__kpi-label--skeleton" />
    </div>
  );
}

export function AnalyticsHub() {
  const { data: summary, isLoading: summaryLoading } = useSWR<AnalyticsSummary>(
    '/api/analytics/summary',
    fetcher,
    swrOpts,
  );

  const { data: full, isLoading: fullLoading } = useSWR<AnalyticsPayload>(
    summary ? '/api/analytics' : null,
    fetcher,
    swrOpts,
  );

  const kpis = full?.kpis ?? summary?.kpis;
  const coaching = full?.coaching ?? summary?.coaching ?? [];
  const showKpiSkeleton = !kpis && (summaryLoading || fullLoading);

  const chartsData: AnalyticsChartsData | null = full
    ? {
        insights: full.insights,
        byPrayer: full.byPrayer,
        stackedWeek: full.stackedWeek,
        weekDays: full.weekDays,
        weekDeeds: full.weekDeeds,
        weekLabels: full.weekLabels,
        moodHistory: full.moodHistory,
        imanMoodSeries: full.imanMoodSeries,
        imanMoodCorrelation: full.imanMoodCorrelation,
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
          {showKpiSkeleton
            ? Array.from({ length: 4 }, (_, i) => <KpiSkeleton key={i} />)
            : [
                { val: kpis?.iman ?? '—', unit: '%', label: 'Iman meter' },
                { val: kpis?.streak ?? '—', unit: '', label: 'Day streak' },
                { val: kpis?.weekRate ?? '—', unit: '%', label: 'This week' },
                { val: kpis?.lifetimeRate ?? '—', unit: '%', label: 'Lifetime' },
              ].map((k) => (
                <div key={k.label} className="dawa-analytics__kpi">
                  <span className="dawa-analytics__kpi-val">
                    <span className="dawa-num">{k.val}</span>
                    {k.unit && <small>{k.unit}</small>}
                  </span>
                  <span className="dawa-analytics__kpi-label">{k.label}</span>
                </div>
              ))}
        </div>
      </section>

      {coaching.length > 0 && (
        <section className="dawa-analytics__coaching">
          <h2 className="dawa-analytics__section-title">Personal guidance</h2>
          <p className="dawa-analytics__section-sub">Actionable insights based on your recent salah patterns</p>
          <ul className="dawa-analytics__tips">
            {coaching.map((tip) => (
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
        <PrayerInsights
          embedded
          insights={full?.insights ?? null}
          isLoading={fullLoading && !full?.insights}
        />
      </div>

      {fullLoading && !chartsData ? (
        <div className="dawa-analytics__charts-loading">
          <ChartShimmer height="300px" />
        </div>
      ) : (
        chartsData && <AnalyticsChartsGrid data={chartsData} />
      )}
    </div>
  );
}
