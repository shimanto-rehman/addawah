'use client';

import { motion } from 'framer-motion';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function HeroStats() {
  const { data } = useSWR<{
    weekCompleted: number;
    weekTotal: number;
    streak: number;
    lifetimeRate: number;
    todayCompleted: number;
  }>('/api/stats', fetcher, { refreshInterval: 30000 });

  const stats = [
    { label: 'Today', value: data ? `${data.todayCompleted}/5` : '—', sub: 'prayers' },
    { label: 'This Week', value: data ? `${data.weekCompleted}/${data.weekTotal}` : '—', sub: 'logged' },
    { label: 'Streak', value: data ? `${data.streak}` : '—', sub: 'days' },
    { label: 'Lifetime', value: data ? `${data.lifetimeRate}%` : '—', sub: 'rate' },
  ];

  return (
    <div className="dawa-tiles">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          className="dawa-tile"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08, duration: 0.5 }}
        >
          <div className="dawa-tile__value">{s.value}</div>
          <div className="dawa-tile__label">{s.label} · {s.sub}</div>
        </motion.div>
      ))}
    </div>
  );
}
