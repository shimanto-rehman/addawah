'use client';

import { useMemo, useRef } from 'react';
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
} from 'chart.js';
import { Bar, Chart, Doughnut, Radar, PolarArea, Line } from 'react-chartjs-2';
import { chartTheme } from '@/lib/chart-theme';
import { describeImanMoodCorrelation } from '@/lib/iman-mood-analytics';
import type { ImanMoodDay } from '@/lib/iman-mood-analytics';
import { MOOD_OPTIONS } from '@/lib/moods';
import type { PrayerInsightsPayload } from '@/lib/prayer-insights';
import type { PrayerName } from '@/lib/constants';
import { useChartResize } from '@/lib/use-chart-resize';

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
);

export type AnalyticsChartsData = {
  insights: PrayerInsightsPayload;
  byPrayer: { prayer: PrayerName; label: string; completed: number; total: number; rate: number }[];
  stackedWeek: { label: string; onTime: number; kaza: number; missed: number }[];
  weekDays: number[];
  weekDeeds: (number | null)[];
  weekLabels: string[];
  moodHistory: { date: string; moodId: string; label: string; iman: number | null }[];
  imanMoodSeries: ImanMoodDay[];
  imanMoodCorrelation: number | null;
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
  const sectionRef = useRef<HTMLElement>(null);
  useChartResize(sectionRef, [data]);

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

  const imanMoodChart = useMemo(() => {
    const series = data.imanMoodSeries;
    const labels = series.map((d) => d.label.split(',')[0] ?? d.label);
    return {
      labels,
      datasets: [
        {
          type: 'line' as const,
          label: 'Iman meter',
          data: series.map((d) => d.iman),
          borderColor: theme.accent,
          backgroundColor: theme.accentSoft,
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 2,
          yAxisID: 'y',
          order: 1,
        },
        {
          type: 'bar' as const,
          label: 'Mood',
          data: series.map((d) => d.moodScore),
          backgroundColor: series.map((d) =>
            d.moodColor ? `${d.moodColor}99` : 'rgba(128,128,128,0.15)',
          ),
          borderColor: series.map((d) => d.moodColor ?? 'transparent'),
          borderWidth: 1,
          borderRadius: 6,
          yAxisID: 'y1',
          order: 2,
        },
      ],
      points: series.filter((d) => d.moodScore != null),
    };
  }, [data.imanMoodSeries, theme]);

  return (
    <section ref={sectionRef} className="dawa-analytics__bento">
      <h2 className="dawa-analytics__section-title">Deep dive charts</h2>
      <p className="dawa-analytics__section-sub">Each view highlights a different angle of your ibadah</p>

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
                    `${theme.categorical[1]}73`,
                    `${theme.categorical[2]}73`,
                    `${theme.categorical[3]}73`,
                    `${theme.categorical[4]}73`,
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
          <p className="dawa-analytics__card-sub">Fard prayers vs daily deeds per day</p>
          <div className="dawa-analytics__chart">
            <Line
              data={{
                labels: data.weekLabels,
                datasets: [
                  {
                    label: 'Fard',
                    data: data.weekDays,
                    borderColor: theme.accent,
                    backgroundColor: theme.accentSoft,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    borderWidth: 2,
                  },
                  {
                    label: 'Deeds',
                    data: data.weekDeeds,
                    borderColor: theme.success,
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0.4,
                    pointRadius: 3,
                    borderWidth: 2,
                    borderDash: [5, 4],
                    spanGaps: true,
                  },
                ],
              }}
              options={{
                ...chartOpts(theme),
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
                  backgroundColor: theme.categorical,
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
          <p className="dawa-analytics__card-sub">
            {describeImanMoodCorrelation(data.imanMoodCorrelation)}
            {data.imanMoodCorrelation != null && (
              <> · r = {data.imanMoodCorrelation.toFixed(2)}</>
            )}
          </p>
          {imanMoodChart.points.length > 0 ? (
            <div className="dawa-analytics__chart">
              <Chart
                type="bar"
                data={{
                  labels: imanMoodChart.labels,
                  datasets: imanMoodChart.datasets,
                }}
                options={{
                  ...chartOpts(theme),
                  interaction: { mode: 'index', intersect: false },
                  plugins: {
                    ...chartOpts(theme).plugins,
                    legend: { display: false },
                    tooltip: {
                      ...chartOpts(theme).plugins?.tooltip,
                      callbacks: {
                        afterTitle: (items) => {
                          const i = items[0]?.dataIndex;
                          if (i == null) return '';
                          const day = data.imanMoodSeries[i];
                          if (!day) return '';
                          const parts = [
                            day.moodLabel ? `Mood: ${day.moodLabel}` : 'No mood logged',
                            `On time: ${day.onTime}`,
                            `Kaza: ${day.kaza}`,
                            `Missed: ${day.missed}`,
                            day.deeds != null ? `Deeds: ${day.deeds}/5` : '',
                          ].filter(Boolean);
                          return parts.join(' · ');
                        },
                      },
                    },
                  },
                  scales: {
                    x: {
                      ticks: { color: theme.text, font: { size: 9 }, maxRotation: 45, minRotation: 0 },
                      grid: { display: false },
                    },
                    y: {
                      type: 'linear',
                      position: 'left',
                      min: 0,
                      max: 100,
                      title: { display: true, text: 'Iman %', color: theme.text, font: { size: 9 } },
                      ticks: { color: theme.text, font: { size: 9 }, maxTicksLimit: 5 },
                      grid: { color: theme.grid },
                    },
                    y1: {
                      type: 'linear',
                      position: 'right',
                      min: 0,
                      max: 6,
                      title: { display: true, text: 'Mood', color: theme.text, font: { size: 9 } },
                      ticks: {
                        stepSize: 1,
                        color: theme.text,
                        font: { size: 8 },
                        callback: (v) => {
                          const labels = [...MOOD_OPTIONS].reverse().map((m) => m.label);
                          return labels[Number(v) - 1] ?? '';
                        },
                      },
                      grid: { drawOnChartArea: false },
                    },
                  },
                }}
              />
            </div>
          ) : (
            <p className="dawa-analytics__empty">
              Check in your mood on the dashboard to see how emotional patterns track with your iman meter.
            </p>
          )}
        </article>
      </div>
    </section>
  );
}
