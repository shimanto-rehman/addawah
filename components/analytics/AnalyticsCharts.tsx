'use client';

import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import useSWR from 'swr';
import { PRAYER_LABELS, type PrayerName } from '@/lib/constants';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function AnalyticsCharts() {
  const { data } = useSWR<{
    byPrayer: { prayer: PrayerName; completed: number; total: number; rate: number }[];
    monthly: { month: string; completed: number; total: number }[];
    lifetimeRate: number;
    totalCompleted: number;
  }>('/api/analytics', fetcher);

  const barData = {
    labels: data?.monthly.map((m) => m.month) ?? [],
    datasets: [{
      label: 'Completed',
      data: data?.monthly.map((m) => m.completed) ?? [],
      backgroundColor: 'rgba(201, 162, 39, 0.7)',
      borderRadius: 8,
    }],
  };

  const doughnutData = {
    labels: data?.byPrayer.map((p) => PRAYER_LABELS[p.prayer]) ?? [],
    datasets: [{
      data: data?.byPrayer.map((p) => p.completed) ?? [],
      backgroundColor: ['#c9a227', '#2eb88a', '#3b9eff', '#9b7bf7', '#f06bab'],
      borderWidth: 0,
    }],
  };

  return (
    <div className="dawa-duo" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
      <motion.div className="dawa-panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="dawa-panel__title">Lifetime</h2>
        <div className="dawa-tiles" style={{ marginBottom: 16, gridTemplateColumns: '1fr 1fr' }}>
          <div className="dawa-tile"><div className="dawa-tile__value">{data?.totalCompleted ?? '—'}</div><div className="dawa-tile__label">Total logged</div></div>
          <div className="dawa-tile"><div className="dawa-tile__value">{data ? `${data.lifetimeRate}%` : '—'}</div><div className="dawa-tile__label">Completion</div></div>
        </div>
        <div style={{ maxWidth: 260, margin: '0 auto' }}>
          <Doughnut data={doughnutData} options={{ plugins: { legend: { position: 'bottom', labels: { color: '#b8ad98', boxWidth: 12 } } }, cutout: '62%' }} />
        </div>
      </motion.div>
      <motion.div className="dawa-panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <h2 className="dawa-panel__title">Monthly progress</h2>
        <Bar data={barData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#6e6658' }, grid: { display: false } }, y: { ticks: { color: '#6e6658' }, grid: { color: 'rgba(255,255,255,0.04)' } } } }} />
      </motion.div>
    </div>
  );
}
