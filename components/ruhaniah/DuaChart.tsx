'use client';

import { useMemo } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  DoughnutController,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { chartTheme } from '@/lib/chart-theme';

ChartJS.register(ArcElement, Tooltip, Legend, DoughnutController);

type DuaStats = {
  total: number;
  answered: number;
  waiting: number;
};

type Props = {
  stats: DuaStats;
};

export function DuaChart({ stats }: Props) {
  const theme = chartTheme();

  const data = useMemo(() => {
    const stored = stats.total - stats.answered - stats.waiting;

    return {
      labels: ['Answered', 'Waiting', 'Stored for Akhirah'],
      datasets: [
        {
          data: [stats.answered, stats.waiting, Math.max(0, stored)],
          backgroundColor: [
            theme.success,
            theme.accent,
            `${theme.accent}44`,
          ],
          borderColor: theme.surface,
          borderWidth: 3,
          hoverOffset: 6,
        },
      ],
    };
  }, [stats, theme]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          display: true,
          position: 'bottom' as const,
          labels: {
            color: theme.text,
            font: { size: 11 },
            boxWidth: 10,
            padding: 14,
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

  const acceptanceRate = stats.total > 0
    ? Math.round((stats.answered / stats.total) * 100)
    : 0;

  return (
    <div className="dawa-insight-card">
      <div className="dawa-insight-card__header">
        <h3 className="dawa-insight-card__title">Dua Tracker</h3>
        <span className="dawa-insight-card__badge">
          {stats.total} total
        </span>
      </div>

      <div className="dawa-insight-card__chart dawa-insight-card__chart--doughnut" style={{ height: 220 }}>
        {stats.total > 0 ? (
          <>
            <Doughnut data={data} options={options} />
            <div className="dawa-insight-doughnut-center">
              <span className="dawa-insight-doughnut-center__pct">{acceptanceRate}%</span>
              <span className="dawa-insight-doughnut-center__label">Accepted</span>
            </div>
          </>
        ) : (
          <p className="dawa-insight-card__empty">Log some duas to see your tracker</p>
        )}
      </div>
    </div>
  );
}
