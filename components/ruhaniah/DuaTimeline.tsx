'use client';

import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  BarController,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { chartTheme } from '@/lib/chart-theme';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, BarController);

type DuaTimelineEntry = {
  text: string;
  category: string;
  status: string;
  daysToAccept: number;
  dateStarted: string;
  dateResolved: string;
};

type DuaListItem = {
  id: string;
  text: string;
  category: string;
  status: string;
  dateStarted: string;
  dateResolved: string | null;
  daysWaiting: number | null;
};

const STATUS_ICONS: Record<string, string> = {
  ANSWERED_SAME: '🌸',
  ANSWERED_DIFFERENT: '🌿',
  WAITING: '🕋',
  STORED_AKHIRAH: '✨',
};

const STATUS_LABELS: Record<string, string> = {
  ANSWERED_SAME: 'Answered as asked',
  ANSWERED_DIFFERENT: 'Answered differently',
  WAITING: 'Still waiting',
  STORED_AKHIRAH: 'Stored for Akhirah',
};

const STATUS_COLORS: Record<string, string> = {
  ANSWERED_SAME: '#3ecf8e',
  ANSWERED_DIFFERENT: '#2eb88a',
  WAITING: '#e8b923',
  STORED_AKHIRAH: '#9b7bf7',
};

type Props = {
  duaTimeline: DuaTimelineEntry[];
  duaList: DuaListItem[];
  duaStats: { total: number; answered: number; waiting: number; stored: number };
};

export function DuaTimeline({ duaTimeline, duaList, duaStats }: Props) {
  const theme = chartTheme();

  // Bar chart: acceptance duration for answered duas
  const barData = useMemo(() => {
    const sorted = [...duaTimeline].sort((a, b) => a.daysToAccept - b.daysToAccept);
    const labels = sorted.map((d) => {
      const words = d.text.split(' ');
      return words.length > 4 ? words.slice(0, 4).join(' ') + '…' : d.text;
    });

    return {
      labels,
      datasets: [
        {
          label: 'Days to acceptance',
          data: sorted.map((d) => d.daysToAccept),
          backgroundColor: sorted.map((d) =>
            d.status === 'ANSWERED_SAME' ? `${theme.success}cc` : `${theme.accent}cc`,
          ),
          borderColor: sorted.map((d) =>
            d.status === 'ANSWERED_SAME' ? theme.success : theme.accent,
          ),
          borderWidth: 1.5,
          borderRadius: 6,
          barPercentage: 0.7,
        },
      ],
    };
  }, [duaTimeline, theme]);

  const barOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y' as const,
      scales: {
        x: {
          title: {
            display: true,
            text: 'Days',
            color: theme.text,
            font: { size: 11 },
          },
          ticks: { color: theme.text, font: { size: 10 } },
          grid: { color: theme.grid },
        },
        y: {
          ticks: { color: theme.text, font: { size: 10 } },
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
          callbacks: {
            title: (items: { label: string; dataIndex: number }[]) => {
              const idx = items[0]?.dataIndex;
              return duaTimeline[idx]?.text || '';
            },
            label: (ctx: { parsed: { x: number | null } }) => `${ctx.parsed.x ?? 0} days`,
          },
        },
      },
    }),
    [theme, duaTimeline],
  );

  // Doughnut data for status breakdown
  const doughnutData = useMemo(() => ({
    labels: ['Answered as asked', 'Answered differently', 'Waiting', 'Stored for Akhirah'],
    datasets: [{
      data: [duaStats.answered, duaStats.total - duaStats.answered - duaStats.waiting - duaStats.stored, duaStats.waiting, duaStats.stored],
      backgroundColor: [
        STATUS_COLORS.ANSWERED_SAME,
        STATUS_COLORS.ANSWERED_DIFFERENT,
        STATUS_COLORS.WAITING,
        STATUS_COLORS.STORED_AKHIRAH,
      ],
      borderColor: theme.surface,
      borderWidth: 3,
      hoverOffset: 6,
    }],
  }), [duaStats, theme]);

  const acceptanceRate = duaStats.total > 0
    ? Math.round((duaStats.answered / duaStats.total) * 100)
    : 0;

  return (
    <div className="dawa-insight-card">
      <div className="dawa-insight-card__header">
        <h3 className="dawa-insight-card__title">Dua Garden &amp; Graveyard</h3>
        <span className="dawa-insight-card__badge">{duaStats.total} total</span>
      </div>

      {/* Status breakdown - visual pills */}
      <div className="dawa-dua-status-row">
        {duaStats.answered > 0 && (
          <div className="dawa-dua-status-pill" style={{ borderColor: STATUS_COLORS.ANSWERED_SAME }}>
            <span>🌸</span>
            <span className="dawa-dua-status-pill__count">{duaStats.answered}</span>
            <span className="dawa-dua-status-pill__label">Answered</span>
          </div>
        )}
        {duaStats.waiting > 0 && (
          <div className="dawa-dua-status-pill" style={{ borderColor: STATUS_COLORS.WAITING }}>
            <span>🕋</span>
            <span className="dawa-dua-status-pill__count">{duaStats.waiting}</span>
            <span className="dawa-dua-status-pill__label">Waiting</span>
          </div>
        )}
        {duaStats.stored > 0 && (
          <div className="dawa-dua-status-pill" style={{ borderColor: STATUS_COLORS.STORED_AKHIRAH }}>
            <span>✨</span>
            <span className="dawa-dua-status-pill__count">{duaStats.stored}</span>
            <span className="dawa-dua-status-pill__label">For Akhirah</span>
          </div>
        )}
      </div>

      {/* Acceptance rate */}
      <div className="dawa-dua-rate">
        <div className="dawa-dua-rate__bar">
          <div
            className="dawa-dua-rate__fill"
            style={{ width: `${acceptanceRate}%`, background: `linear-gradient(90deg, ${theme.success}, ${theme.accent})` }}
          />
        </div>
        <span className="dawa-dua-rate__text">{acceptanceRate}% acceptance rate</span>
      </div>

      {/* Timeline bar chart - how long each dua took */}
      {duaTimeline.length > 0 && (
        <div className="dawa-insight-card__chart" style={{ height: Math.max(160, duaTimeline.length * 36) }}>
          <Bar data={barData} options={barOptions} />
        </div>
      )}

      {/* Dua list */}
      {duaList.length > 0 && (
        <div className="dawa-dua-list-insights">
          {duaList.map((dua) => (
            <div key={dua.id} className="dawa-dua-list-item">
              <span className="dawa-dua-list-item__icon">{STATUS_ICONS[dua.status] || '🕋'}</span>
              <div className="dawa-dua-list-item__body">
                <p className="dawa-dua-list-item__text">{dua.text}</p>
                <p className="dawa-dua-list-item__meta">
                  {STATUS_LABELS[dua.status]}
                  {dua.daysWaiting !== null && ` · waiting ${dua.daysWaiting} days`}
                  {dua.dateResolved && ` · accepted in ${Math.max(1, Math.round((new Date(dua.dateResolved).getTime() - new Date(dua.dateStarted).getTime()) / 86400000))} days`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {duaStats.total === 0 && (
        <p className="dawa-insight-card__empty">Log some duas to see your garden grow</p>
      )}
    </div>
  );
}
