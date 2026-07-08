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
  Legend,
  LineController,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { chartTheme } from '@/lib/chart-theme';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend, LineController);

type BarakahEntry = {
  date: string;
  timeScore: number;
  rizqScore: number;
  healthScore: number;
  heartScore: number;
};

type Props = {
  history: BarakahEntry[];
};

const AREAS = [
  { key: 'timeScore', label: 'Time', icon: '⏰' },
  { key: 'rizqScore', label: 'Rizq', icon: '💰' },
  { key: 'healthScore', label: 'Health', icon: '💚' },
  { key: 'heartScore', label: 'Heart', icon: '🤍' },
] as const;

export function BarakahTrend({ history }: Props) {
  const theme = chartTheme();

  const data = useMemo(() => {
    const sorted = [...history].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    const labels = sorted.map((e) => {
      const d = new Date(e.date);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    return {
      labels,
      datasets: AREAS.map((area, i) => {
        const color = theme.categorical[i] ?? theme.accent;
        return {
          label: `${area.icon} ${area.label}`,
          data: sorted.map((e) => e[area.key]),
          borderColor: color,
          backgroundColor: `${color}18`,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: color,
          pointBorderColor: theme.surface,
          pointBorderWidth: 1.5,
          fill: false,
          tension: 0.35,
        };
      }),
    };
  }, [history, theme]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index' as const, intersect: false },
      scales: {
        y: {
          min: 0,
          max: 5,
          ticks: { stepSize: 1, color: theme.text, font: { size: 10 } },
          grid: { color: theme.grid },
        },
        x: {
          ticks: { color: theme.text, font: { size: 10 }, maxRotation: 45 },
          grid: { display: false },
        },
      },
      plugins: {
        legend: {
          display: true,
          position: 'top' as const,
          labels: {
            color: theme.text,
            font: { size: 11 },
            boxWidth: 12,
            padding: 12,
            usePointStyle: true,
            pointStyle: 'circle',
          },
        },
        tooltip: {
          backgroundColor: theme.surface,
          titleColor: theme.text,
          bodyColor: theme.text,
          borderColor: theme.accentSoft,
          borderWidth: 1,
        },
      },
    }),
    [theme],
  );

  // Compute averages
  const averages = useMemo(() => {
    if (history.length === 0) return null;
    const sums = { timeScore: 0, rizqScore: 0, healthScore: 0, heartScore: 0 };
    for (const entry of history) {
      sums.timeScore += entry.timeScore;
      sums.rizqScore += entry.rizqScore;
      sums.healthScore += entry.healthScore;
      sums.heartScore += entry.heartScore;
    }
    const n = history.length;
    return {
      timeScore: (sums.timeScore / n).toFixed(1),
      rizqScore: (sums.rizqScore / n).toFixed(1),
      healthScore: (sums.healthScore / n).toFixed(1),
      heartScore: (sums.heartScore / n).toFixed(1),
    };
  }, [history]);

  return (
    <div className="dawa-insight-card">
      <div className="dawa-insight-card__header">
        <h3 className="dawa-insight-card__title">Barakah Flow</h3>
        <span className="dawa-insight-card__badge">30 days</span>
      </div>

      <div className="dawa-insight-card__chart" style={{ height: 220 }}>
        {history.length > 0 ? (
          <Line data={data} options={options} />
        ) : (
          <p className="dawa-insight-card__empty">Complete a few check-ins to see your barakah flow</p>
        )}
      </div>

      {averages && (
        <div className="dawa-insight-card__stats">
          {AREAS.map((area, i) => (
            <div key={area.key} className="dawa-insight-stat">
              <span className="dawa-insight-stat__label">{area.icon} {area.label}</span>
              <span className="dawa-insight-stat__value" style={{ color: theme.categorical[i] ?? theme.accent }}>
                {averages[area.key]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
