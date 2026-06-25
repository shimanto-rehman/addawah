'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { PRAYER_LABELS } from '@/lib/constants';
import { chartTheme } from '@/lib/chart-theme';
import type { PrayerInsightsPayload } from '@/lib/prayer-insights';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
);

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to load');
  return json as PrayerInsightsPayload;
};

type ProfilePrayerChartsProps = {
  insightsUrl: string;
  title?: string;
};

function MissedAreaChart({
  data,
  theme,
}: {
  data: PrayerInsightsPayload;
  theme: ReturnType<typeof chartTheme>;
}) {
  const labels = data.days.map((_, i) => String(i + 1).padStart(2, '0'));
  const missedValues = data.days.map((d) => d.missed);

  const fillGradient = useMemo(() => {
    if (typeof window === 'undefined') return theme.accentSoft;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return theme.accentSoft;
    const g = ctx.createLinearGradient(0, 0, 0, 200);
    g.addColorStop(0, theme.accentGlow);
    g.addColorStop(1, theme.accentSoft);
    return g;
  }, [theme.accentGlow, theme.accentSoft]);

  return (
    <Line
      data={{
        labels,
        datasets: [{
          label: 'Missed fard',
          data: missedValues,
          borderColor: theme.accent,
          backgroundColor: fillGradient,
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: theme.accent,
          borderWidth: 2,
        }],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        clip: false,
        layout: { padding: { top: 16, right: 8, bottom: 4, left: 4 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: theme.surface,
            callbacks: {
              title: (items) => data.days[items[0]?.dataIndex ?? 0]?.label ?? '',
              label: (ctx) => ` ${ctx.parsed.y} missed`,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: theme.text, font: { size: 9 }, maxTicksLimit: 7 },
            grid: { color: theme.grid },
            border: { display: false },
          },
          y: {
            min: 0,
            max: 5,
            grace: '15%',
            ticks: { color: theme.text, font: { size: 9 }, stepSize: 1 },
            grid: { color: theme.grid },
            border: { display: false },
          },
        },
      }}
    />
  );
}

export function ProfilePrayerCharts({ insightsUrl, title = 'Prayer insights' }: ProfilePrayerChartsProps) {
  const { data, error, isLoading } = useSWR<PrayerInsightsPayload>(insightsUrl, fetcher);
  const theme = chartTheme();

  if (error) {
    return (
      <section className="dawa-glass dawa-profile-charts">
        <p className="dawa-profile-charts__private">Prayer charts are not available.</p>
      </section>
    );
  }

  const labels = data?.days.map((d) => d.label) ?? [];
  const imanValues = data?.days.map((d) => d.iman) ?? [];
  const weekLabels = data?.days.slice(-7).map((d) => d.label.split(' ')[0]) ?? [];
  const weekOnTime = data?.days.slice(-7).map((d) => d.onTime) ?? [];

  return (
    <section className="dawa-glass dawa-profile-charts">
      <header className="dawa-profile-charts__head">
        <h2 className="dawa-social__title">{title}</h2>
        {data && (
          <span className="dawa-profile-charts__iman">
            Iman <strong><span className="dawa-num">{data.currentIman}</span>%</strong>
          </span>
        )}
      </header>

      <div className="dawa-profile-charts__grid">
        <article className="dawa-profile-charts__card">
          <h3 className="dawa-profile-charts__card-title">Iman meter · 14 days</h3>
          <p className="dawa-profile-charts__card-sub">Wakt salah lifts the curve; kaza and missed pull it down.</p>
          <div className="dawa-profile-charts__canvas">
            {isLoading ? (
              <p className="dawa-profile-charts__loading">Loading…</p>
            ) : data ? (
              <Line
                data={{
                  labels,
                  datasets: [{
                    label: 'Iman',
                    data: imanValues,
                    borderColor: theme.accent,
                    backgroundColor: theme.accentSoft,
                    fill: true,
                    tension: 0.38,
                    pointRadius: 2,
                    borderWidth: 2,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { ticks: { color: theme.text, font: { size: 9 }, maxTicksLimit: 7 }, grid: { display: false } },
                    y: { min: 0, max: 100, ticks: { color: theme.text, font: { size: 9 }, stepSize: 25 }, grid: { color: theme.grid } },
                  },
                }}
              />
            ) : null}
          </div>
        </article>

        <article className="dawa-profile-charts__card">
          <h3 className="dawa-profile-charts__card-title">Missed salahs</h3>
          <p className="dawa-profile-charts__card-sub">Fard not logged before wakt ended.</p>
          <div className="dawa-profile-charts__canvas dawa-profile-charts__canvas--tall">
            {isLoading ? (
              <p className="dawa-profile-charts__loading">Loading…</p>
            ) : data ? (
              <MissedAreaChart data={data} theme={theme} />
            ) : null}
          </div>
        </article>

        <article className="dawa-profile-charts__card">
          <h3 className="dawa-profile-charts__card-title">Wakt breakdown</h3>
          <p className="dawa-profile-charts__card-sub">On time vs kaza vs missed (14 days).</p>
          <div className="dawa-profile-charts__canvas dawa-profile-charts__canvas--donut">
            {isLoading ? (
              <p className="dawa-profile-charts__loading">Loading…</p>
            ) : data ? (
              <Doughnut
                data={{
                  labels: ['On time', 'Kaza', 'Missed'],
                  datasets: [{
                    data: [data.totals.onTime, data.totals.kaza, data.totals.missed],
                    backgroundColor: [theme.success, theme.warn, theme.danger],
                    borderWidth: 0,
                    hoverOffset: 6,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '62%',
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { color: theme.text, font: { size: 11 }, boxWidth: 10, padding: 12 },
                    },
                  },
                }}
              />
            ) : null}
          </div>
        </article>

        <article className="dawa-profile-charts__card">
          <h3 className="dawa-profile-charts__card-title">On-time this week</h3>
          <p className="dawa-profile-charts__card-sub">Fard prayed within wakt, last 7 days.</p>
          <div className="dawa-profile-charts__canvas">
            {isLoading ? (
              <p className="dawa-profile-charts__loading">Loading…</p>
            ) : data ? (
              <Bar
                data={{
                  labels: weekLabels,
                  datasets: [{
                    label: 'On time',
                    data: weekOnTime,
                    backgroundColor: theme.accentGlow,
                    borderColor: theme.accent,
                    borderWidth: 1,
                    borderRadius: 6,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { ticks: { color: theme.text, font: { size: 9 } }, grid: { display: false } },
                    y: { min: 0, max: 5, ticks: { color: theme.text, font: { size: 9 }, stepSize: 1 }, grid: { color: theme.grid } },
                  },
                }}
              />
            ) : null}
          </div>
        </article>
      </div>
    </section>
  );
}
