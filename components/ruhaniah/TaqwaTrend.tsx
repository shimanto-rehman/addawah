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

type HistoryEntry = {
  date: string;
  score: number;
};

type Props = {
  history: HistoryEntry[];
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function TaqwaTrend({ history }: Props) {
  const theme = chartTheme();

  const data = useMemo(() => {
    // Sort by date ascending for the chart
    const sorted = [...history].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    return {
      labels: sorted.map((e) => formatDate(e.date)),
      datasets: [
        {
          label: 'Taqwa Score',
          data: sorted.map((e) => e.score),
          borderColor: theme.accent,
          backgroundColor: `${theme.accent}18`,
          borderWidth: 2,
          pointBackgroundColor: theme.accent,
          pointBorderColor: theme.surface,
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.35,
        },
      ],
    };
  }, [history, theme]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          min: 0,
          max: 5,
          ticks: {
            stepSize: 1,
            color: theme.text,
            font: { size: 10 },
          },
          grid: { color: theme.grid },
        },
        x: {
          ticks: {
            color: theme.text,
            font: { size: 10 },
            maxRotation: 45,
          },
          grid: { display: false },
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
        },
      },
    }),
    [theme],
  );

  const avg = history.length > 0
    ? (history.reduce((s, e) => s + e.score, 0) / history.length).toFixed(1)
    : '—';

  return (
    <div className="dawa-insight-card">
      <div className="dawa-insight-card__header">
        <h3 className="dawa-insight-card__title">Taqwa Trend</h3>
        <span className="dawa-insight-card__badge">30 days</span>
      </div>

      <div className="dawa-insight-card__chart" style={{ height: 200 }}>
        {history.length > 0 ? (
          <Line data={data} options={options} />
        ) : (
          <p className="dawa-insight-card__empty">Complete a few check-ins to see your trend</p>
        )}
      </div>

      <div className="dawa-insight-card__stats">
        <div className="dawa-insight-stat">
          <span className="dawa-insight-stat__label">Average</span>
          <span className="dawa-insight-stat__value">{avg}</span>
        </div>
        <div className="dawa-insight-stat">
          <span className="dawa-insight-stat__label">Check-ins</span>
          <span className="dawa-insight-stat__value">{history.length}</span>
        </div>
      </div>
    </div>
  );
}
