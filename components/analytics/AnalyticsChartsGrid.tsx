'use client';

import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  PolarAreaController,
  RadarController,
  BarController,
  LineController,
  DoughnutController,
  ScatterController,
} from 'chart.js';
import { Bar, Doughnut, Radar, PolarArea, Line, Scatter } from 'react-chartjs-2';
import { chartTheme } from '@/lib/chart-theme';
import { moodById, moodScore, MOOD_OPTIONS } from '@/lib/moods';
import type { PrayerInsightsPayload } from '@/lib/prayer-insights';
import type { PrayerName } from '@/lib/constants';

ChartJS.register(
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  PolarAreaController,
  RadarController,
  BarController,
  LineController,
  DoughnutController,
  ScatterController,
);

export type AnalyticsChartsData = {
  insights: PrayerInsightsPayload;
  byPrayer: { prayer: PrayerName; label: string; completed: number; total: number; rate: number }[];
  stackedWeek: { label: string; onTime: number; kaza: number; missed: number }[];
  weekDays: number[];
  weekLabels: string[];
  moodHistory: { date: string; moodId: string; label: string; iman: number | null }[];
};

function chartOpts(theme: ReturnType<typeof chartTheme>, hideLegend = false) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: !hideLegend,
        labels: { color: theme.text, font: { size: 11 }, boxWidth: 10, padding: 14 },
      },
      tooltip: {
        backgroundColor: theme.surface,
        titleColor: theme.text,
        bodyColor: theme.text,
        borderColor: theme.accentSoft,
        borderWidth: 1,
      },
    },
  };
}

export function AnalyticsChartsGrid({ data }: { data: AnalyticsChartsData }) {
  const theme = chartTheme();

  const radarData = useMemo(
    () => ({
      labels: data.byPrayer.map((p) => p.label),
      datasets: [{
        label: 'Completion %',
        data: data.byPrayer.map((p) => p.rate),
        backgroundColor: theme.accentGlow,
        borderColor: theme.accent,
        borderWidth: 2,
        pointBackgroundColor: theme.accent,
      }],
    }),
    [data.byPrayer, theme],
  );

  const moodVsIman = useMemo(() => {
    const points = data.moodHistory
      .filter((m) => m.iman != null && moodScore(m.moodId) != null)
      .map((m) => {
        const mood = moodById(m.moodId);
        return {
          x: moodScore(m.moodId)!,
          y: m.iman!,
          color: mood?.color ?? theme.accent,
          label: m.label,
          date: m.date,
        };
      });
    return {
      points,
      chart: {
        datasets: [{
          label: 'Check-ins',
          data: points.map((p) => ({ x: p.x, y: p.y })),
          backgroundColor: points.map((p) => p.color),
          borderColor: points.map((p) => p.color),
          borderWidth: 1,
          pointRadius: 6,
          pointHoverRadius: 8,
        }],
      },
    };
  }, [data.moodHistory, theme]);

  const moodAxisLabels = [...MOOD_OPTIONS].reverse().map((m) => m.label);

  return (
    <section className="dawa-analytics__bento">
      <h2 className="dawa-analytics__section-title">Deep dive charts</h2>
      <p className="dawa-analytics__section-sub">Six+ views — each highlights a different angle of your ibadah</p>

      <div className="dawa-analytics__grid">
        <article className="dawa-analytics__card dawa-glass span-2">
          <h3 className="dawa-analytics__card-title">Prayer strength radar</h3>
          <p className="dawa-analytics__card-sub">Completion rate per fard — spot weak points</p>
          <div className="dawa-analytics__chart dawa-analytics__chart--radar">
            <Radar
              data={radarData}
              options={{
                ...chartOpts(theme, true),
                scales: {
                  r: {
                    min: 0,
                    max: 100,
                    ticks: { display: false, stepSize: 25 },
                    grid: { color: theme.grid },
                    angleLines: { color: theme.grid },
                    pointLabels: { color: theme.text, font: { size: 11 } },
                  },
                },
              }}
            />
          </div>
        </article>

        <article className="dawa-analytics__card dawa-glass">
          <h3 className="dawa-analytics__card-title">Horizontal rates</h3>
          <p className="dawa-analytics__card-sub">Per-prayer completion %</p>
          <div className="dawa-analytics__chart">
            <Bar
              data={{
                labels: data.byPrayer.map((p) => p.label),
                datasets: [{
                  label: 'Rate',
                  data: data.byPrayer.map((p) => p.rate),
                  backgroundColor: [
                    theme.accentGlow,
                    'rgba(46, 184, 138, 0.45)',
                    'rgba(59, 158, 255, 0.45)',
                    'rgba(155, 123, 247, 0.45)',
                    'rgba(240, 107, 171, 0.45)',
                  ],
                  borderRadius: 8,
                  borderSkipped: false,
                }],
              }}
              options={{
                ...chartOpts(theme, true),
                indexAxis: 'y' as const,
                scales: {
                  x: { min: 0, max: 100, ticks: { color: theme.text, font: { size: 10 } }, grid: { color: theme.grid } },
                  y: { ticks: { color: theme.text, font: { size: 11 } }, grid: { display: false } },
                },
              }}
            />
          </div>
        </article>

        <article className="dawa-analytics__card dawa-glass span-2">
          <h3 className="dawa-analytics__card-title">Wakt breakdown · 7 days</h3>
          <p className="dawa-analytics__card-sub">Stacked — on time, kaza, missed</p>
          <div className="dawa-analytics__chart">
            <Bar
              data={{
                labels: data.stackedWeek.map((d) => d.label),
                datasets: [
                  { label: 'On time', data: data.stackedWeek.map((d) => d.onTime), backgroundColor: theme.success, borderRadius: 4 },
                  { label: 'Kaza', data: data.stackedWeek.map((d) => d.kaza), backgroundColor: theme.warn, borderRadius: 4 },
                  { label: 'Missed', data: data.stackedWeek.map((d) => d.missed), backgroundColor: theme.danger, borderRadius: 4 },
                ],
              }}
              options={{
                ...chartOpts(theme),
                scales: {
                  x: { stacked: true, ticks: { color: theme.text, font: { size: 10 } }, grid: { display: false } },
                  y: { stacked: true, max: 5, ticks: { color: theme.text, stepSize: 1 }, grid: { color: theme.grid } },
                },
              }}
            />
          </div>
        </article>

        <article className="dawa-analytics__card dawa-glass">
          <h3 className="dawa-analytics__card-title">Polar balance</h3>
          <p className="dawa-analytics__card-sub">14-day totals split</p>
          <div className="dawa-analytics__chart dawa-analytics__chart--polar">
            <PolarArea
              data={{
                labels: ['On time', 'Kaza', 'Missed'],
                datasets: [{
                  data: [data.insights.totals.onTime, data.insights.totals.kaza, data.insights.totals.missed],
                  backgroundColor: [theme.success, theme.warn, theme.danger],
                  borderWidth: 0,
                }],
              }}
              options={{
                ...chartOpts(theme),
                scales: {
                  r: {
                    ticks: { display: false },
                    grid: { color: theme.grid },
                  },
                },
              }}
            />
          </div>
        </article>

        <article className="dawa-analytics__card dawa-glass">
          <h3 className="dawa-analytics__card-title">Week completion</h3>
          <p className="dawa-analytics__card-sub">Fard count per day</p>
          <div className="dawa-analytics__chart">
            <Line
              data={{
                labels: data.weekLabels,
                datasets: [{
                  label: 'Fard',
                  data: data.weekDays,
                  borderColor: theme.accent,
                  backgroundColor: theme.accentSoft,
                  fill: true,
                  tension: 0.4,
                  pointRadius: 4,
                  borderWidth: 2,
                }],
              }}
              options={{
                ...chartOpts(theme, true),
                scales: {
                  x: { ticks: { color: theme.text, font: { size: 10 } }, grid: { display: false } },
                  y: { min: 0, max: 5, ticks: { color: theme.text, stepSize: 1 }, grid: { color: theme.grid } },
                },
              }}
            />
          </div>
        </article>

        <article className="dawa-analytics__card dawa-glass">
          <h3 className="dawa-analytics__card-title">Distribution ring</h3>
          <p className="dawa-analytics__card-sub">Lifetime by prayer</p>
          <div className="dawa-analytics__chart dawa-analytics__chart--donut">
            <Doughnut
              data={{
                labels: data.byPrayer.map((p) => p.label),
                datasets: [{
                  data: data.byPrayer.map((p) => p.completed),
                  backgroundColor: ['#c9a227', '#2eb88a', '#3b9eff', '#9b7bf7', '#f06bab'],
                  borderWidth: 0,
                  hoverOffset: 8,
                }],
              }}
              options={{
                ...chartOpts(theme),
                cutout: '58%',
              }}
            />
          </div>
        </article>

        <article className="dawa-analytics__card dawa-glass">
          <h3 className="dawa-analytics__card-title">Iman vs mood</h3>
          <p className="dawa-analytics__card-sub">How you felt against your iman meter</p>
          {moodVsIman.points.length > 0 ? (
            <div className="dawa-analytics__chart">
              <Scatter
                data={moodVsIman.chart}
                options={{
                  ...chartOpts(theme, true),
                  plugins: {
                    ...chartOpts(theme, true).plugins,
                    tooltip: {
                      ...chartOpts(theme, true).plugins?.tooltip,
                      callbacks: {
                        title: (items) => {
                          const i = items[0]?.dataIndex;
                          return i != null ? moodVsIman.points[i]?.date ?? '' : '';
                        },
                        label: (ctx) => {
                          const p = moodVsIman.points[ctx.dataIndex];
                          return p ? `${p.label} · Iman ${p.y}%` : '';
                        },
                      },
                    },
                  },
                  scales: {
                    x: {
                      min: 0.5,
                      max: 6.5,
                      ticks: {
                        stepSize: 1,
                        color: theme.text,
                        font: { size: 9 },
                        callback: (v) => moodAxisLabels[Number(v) - 1] ?? '',
                      },
                      grid: { color: theme.grid },
                      title: { display: true, text: 'Mood', color: theme.text, font: { size: 10 } },
                    },
                    y: {
                      min: 0,
                      max: 100,
                      ticks: { color: theme.text, font: { size: 10 } },
                      grid: { color: theme.grid },
                      title: { display: true, text: 'Iman %', color: theme.text, font: { size: 10 } },
                    },
                  },
                }}
              />
            </div>
          ) : (
            <p className="dawa-analytics__empty">
              Check in your mood on the dashboard to see how it tracks with iman.
            </p>
          )}
        </article>
      </div>
    </section>
  );
}
