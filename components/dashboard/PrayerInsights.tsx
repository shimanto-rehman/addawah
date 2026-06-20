'use client';

import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import useSWR from 'swr';
import { PRAYER_LABELS } from '@/lib/constants';
import type { PrayerInsightsPayload } from '@/lib/prayer-insights';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function chartTheme() {
  if (typeof window === 'undefined') {
    return {
      accent: '#e8c547',
      accentSoft: 'rgba(201, 162, 39, 0.12)',
      accentGlow: 'rgba(201, 162, 39, 0.35)',
      surface: '#121824',
      text: '#8a8070',
      grid: 'rgba(128, 128, 128, 0.14)',
    };
  }
  const s = getComputedStyle(document.documentElement);
  return {
    accent: s.getPropertyValue('--accent-bright').trim() || '#e8c547',
    accentSoft: s.getPropertyValue('--accent-soft').trim() || 'rgba(201, 162, 39, 0.12)',
    accentGlow: s.getPropertyValue('--accent-glow').trim() || 'rgba(201, 162, 39, 0.35)',
    surface: s.getPropertyValue('--surface-2').trim() || '#121824',
    text: s.getPropertyValue('--text-dim').trim() || '#8a8070',
    grid: 'rgba(128, 128, 128, 0.14)',
  };
}

function trendLabel(trend: PrayerInsightsPayload['trend']) {
  if (trend === 'up') return 'Rising — prayers in wakt are lifting your meter';
  if (trend === 'down') return 'Declining — more kaza or missed salahs recently';
  return 'Steady — keep praying within wakt to climb';
}

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
    const g = ctx.createLinearGradient(0, 0, 0, 220);
    g.addColorStop(0, theme.accentGlow);
    g.addColorStop(1, theme.accentSoft);
    return g;
  }, [theme.accentGlow, theme.accentSoft]);

  const missedChart = {
    labels,
    datasets: [
      {
        label: 'Missed fard',
        data: missedValues,
        borderColor: theme.accent,
        backgroundColor: fillGradient,
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: theme.accent,
        pointBorderColor: theme.surface,
        pointBorderWidth: 2,
        borderWidth: 2.5,
      },
    ],
  };

  return (
    <Line
      data={missedChart}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        clip: false,
        layout: { padding: { top: 20, right: 14, bottom: 8, left: 10 } },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: theme.surface,
            titleColor: theme.text,
            bodyColor: theme.text,
            borderColor: theme.accentSoft,
            borderWidth: 1,
            titleFont: { size: 12, weight: 'bold' },
            bodyFont: { size: 11 },
            padding: 10,
            callbacks: {
              title: (items) => data.days[items[0]?.dataIndex ?? 0]?.label ?? '',
              label: (ctx) => ` ${ctx.parsed.y} missed`,
              afterLabel(ctx) {
                const day = data.days[ctx.dataIndex];
                if (!day?.missedPrayers.length) return 'All fard logged or pending';
                return day.missedPrayers.map((p) => PRAYER_LABELS[p]).join(', ');
              },
            },
          },
        },
        scales: {
          x: {
            offset: true,
            ticks: {
              color: theme.text,
              font: { size: 10 },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 14,
            },
            grid: { color: theme.grid, drawTicks: false },
            border: { display: false },
          },
          y: {
            min: 0,
            max: 5,
            grace: '18%',
            ticks: {
              color: theme.text,
              font: { size: 10 },
              stepSize: 1,
              precision: 0,
            },
            grid: { color: theme.grid, drawTicks: false },
            border: { display: false },
          },
        },
      }}
    />
  );
}

export function PrayerInsights() {
  const { data, isLoading } = useSWR<PrayerInsightsPayload>('/api/insights', fetcher, {
    refreshInterval: 300_000,
    revalidateOnFocus: false,
    revalidateIfStale: false,
  });

  const theme = chartTheme();
  const labels = data?.days.map((d) => d.label) ?? [];
  const imanValues = data?.days.map((d) => d.iman) ?? [];

  const imanChart = {
    labels,
    datasets: [
      {
        label: 'Iman meter',
        data: imanValues,
        borderColor: theme.accent,
        backgroundColor: theme.accentSoft,
        fill: true,
        tension: 0.38,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: theme.accent,
        pointBorderColor: 'transparent',
      },
    ],
  };

  const baseScales = {
    x: {
      ticks: { color: theme.text, font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 7 },
      grid: { display: false },
    },
    y: {
      ticks: { color: theme.text, font: { size: 10 } },
      grid: { color: theme.grid },
    },
  };

  return (
    <section
      className="dawa-insights"
      aria-label="Prayer insights"
    >
      <div className="dawa-insights__grid">
        <article className="dawa-insights__card dawa-insights__card--iman">
          <header className="dawa-insights__head">
            <div>
              <p className="dawa-insights__eyebrow">Iman meter</p>
              <h2 className="dawa-insights__title">Prayed in wakt vs kaza</h2>
              <p className="dawa-insights__sub">
                Logging within prayer time lifts the curve; late (kaza) or missed salahs pull it down.
              </p>
            </div>
            <div className="dawa-insights__gauge" aria-label={`Iman meter ${data?.currentIman ?? '—'} percent`}>
              <span className="dawa-insights__gauge-val">{data ? data.currentIman : '—'}</span>
              <span className="dawa-insights__gauge-unit">%</span>
            </div>
          </header>

          <div className="dawa-insights__chart">
            {isLoading ? (
              <p className="dawa-insights__loading">Calculating your wakt pattern…</p>
            ) : (
              <Line
                data={imanChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        afterLabel(ctx) {
                          const day = data?.days[ctx.dataIndex];
                          if (!day) return '';
                          return `On time ${day.onTime} · Kaza ${day.kaza} · Missed ${day.missed}`;
                        },
                      },
                    },
                  },
                  scales: {
                    ...baseScales,
                    y: { ...baseScales.y, min: 0, max: 100, ticks: { ...baseScales.y.ticks, stepSize: 20 } },
                  },
                }}
              />
            )}
          </div>

          {data && (
            <>
              <ul className="dawa-insights__legend">
                <li>
                  <span className="dawa-insights__dot dawa-insights__dot--good" />
                  On time <strong>{data.totals.onTime}</strong>
                </li>
                <li>
                  <span className="dawa-insights__dot dawa-insights__dot--warn" />
                  Kaza <strong>{data.totals.kaza}</strong>
                </li>
                <li>
                  <span className="dawa-insights__dot dawa-insights__dot--bad" />
                  Missed <strong>{data.totals.missed}</strong>
                </li>
              </ul>
              <p className={`dawa-insights__trend dawa-insights__trend--${data.trend}`}>
                {trendLabel(data.trend)}
              </p>
            </>
          )}
        </article>

        <article className="dawa-insights__card dawa-insights__card--missed">
          <header className="dawa-insights__chart-head">
            <div className="dawa-insights__chart-head-text">
              <h2 className="dawa-insights__title">Missed salahs</h2>
              <p className="dawa-insights__sub">
                14-day overview — fard not logged before wakt ended
              </p>
            </div>
          </header>

          <div className="dawa-insights__chart dawa-insights__chart--area">
            {isLoading ? (
              <p className="dawa-insights__loading">Loading missed salah history…</p>
            ) : data ? (
              <MissedAreaChart data={data} theme={theme} />
            ) : null}
          </div>

          {data && (
            <footer className="dawa-insights__chart-foot">
              <span className="dawa-insights__chart-foot-stat">
                <strong>{data.totals.missed}</strong> total missed
              </span>
              <span className="dawa-insights__chart-foot-note">
                {data.days.filter((d) => d.missed === 0).length} of 14 days with no gaps
              </span>
            </footer>
          )}
        </article>
      </div>
    </section>
  );
}
