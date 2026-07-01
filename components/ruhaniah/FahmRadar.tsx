'use client';

import { useMemo } from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  RadarController,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { chartTheme } from '@/lib/chart-theme';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, RadarController);

const CATEGORY_LABELS: Record<string, string> = {
  QADR: 'Qadr',
  TRUTH: 'Truth',
  DAWAH: 'Dawah',
  NAFS: 'Nafs',
  AKHIRAH: 'Akhirah',
  SABR_SHUKR: 'Sabr & Shukr',
  ILM: 'Ilm',
  SOCIAL: 'Social',
};

const CATEGORY_ARABIC: Record<string, string> = {
  QADR: 'قدر',
  TRUTH: 'حقيقة',
  DAWAH: 'دعوة',
  NAFS: 'نفس',
  AKHIRAH: 'آخرة',
  SABR_SHUKR: 'صبر وشكر',
  ILM: 'علم',
  SOCIAL: 'اجتماعي',
};

type Props = {
  categoryScores: Record<string, number>;
  strongest: string | null;
  weakest: string | null;
  trend: string;
  overallQAS: number;
};

export function FahmRadar({ categoryScores, strongest, weakest, trend, overallQAS }: Props) {
  const theme = chartTheme();

  const data = useMemo(() => {
    const categories = Object.keys(CATEGORY_LABELS);
    const scores = categories.map((c) => categoryScores[c] || 0);

    return {
      labels: categories.map((c) => CATEGORY_LABELS[c]),
      datasets: [
        {
          label: 'Your Score',
          data: scores,
          backgroundColor: `${theme.accent}22`,
          borderColor: theme.accent,
          borderWidth: 2,
          pointBackgroundColor: theme.accent,
          pointBorderColor: theme.surface,
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
        },
      ],
    };
  }, [categoryScores, theme]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 0,
          max: 4,
          ticks: {
            stepSize: 1,
            color: theme.text,
            backdropColor: 'transparent',
            font: { size: 10 },
          },
          grid: { color: theme.grid },
          angleLines: { color: theme.grid },
          pointLabels: {
            color: theme.text,
            font: { size: 11, weight: 600 as const },
          },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: theme.surface,
          titleColor: theme.text,
          bodyColor: theme.text,
          borderColor: theme.accentSoft,
          borderWidth: 1,
          callbacks: {
            label: (ctx: { parsed: { r: number } }) => `Score: ${ctx.parsed.r.toFixed(1)}`,
          },
        },
      },
    }),
    [theme],
  );

  const trendIcon = trend === 'IMPROVING' ? '📈' : trend === 'DECLINING' ? '📉' : trend === 'STABLE' ? '➡️' : '🆕';
  const trendLabel = trend.charAt(0) + trend.slice(1).toLowerCase();

  return (
    <div className="dawa-insight-card">
      <div className="dawa-insight-card__header">
        <h3 className="dawa-insight-card__title">Fahm — Understanding</h3>
        <span className="dawa-insight-card__badge">
          {trendIcon} {trendLabel}
        </span>
      </div>

      <div className="dawa-insight-card__chart" style={{ height: 260 }}>
        <Radar data={data} options={options} />
      </div>

      <div className="dawa-insight-card__stats">
        <div className="dawa-insight-stat">
          <span className="dawa-insight-stat__label">Overall QAS</span>
          <span className="dawa-insight-stat__value">{overallQAS.toFixed(1)}</span>
        </div>
        {strongest && (
          <div className="dawa-insight-stat">
            <span className="dawa-insight-stat__label">Strongest</span>
            <span className="dawa-insight-stat__value">
              {CATEGORY_LABELS[strongest]} <span className="dawa-insight-stat__arabic">{CATEGORY_ARABIC[strongest]}</span>
            </span>
          </div>
        )}
        {weakest && (
          <div className="dawa-insight-stat">
            <span className="dawa-insight-stat__label">Weakest</span>
            <span className="dawa-insight-stat__value">
              {CATEGORY_LABELS[weakest]} <span className="dawa-insight-stat__arabic">{CATEGORY_ARABIC[weakest]}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
