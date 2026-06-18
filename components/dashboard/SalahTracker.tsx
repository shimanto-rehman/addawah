'use client';

import { motion } from 'framer-motion';
import useSWR from 'swr';
import { useState } from 'react';
import {
  PRAYERS,
  PRAYER_LABELS,
  PRAYER_ARABIC,
  type PrayerName,
} from '@/lib/constants';
import {
  addDays,
  formatDateKey,
  formatWeekLabel,
  getWeekDays,
  startOfWeek,
  type SalahGrid,
} from '@/lib/salah-utils';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function SalahTracker() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const weekKey = formatDateKey(weekStart);

  const { data, mutate, isLoading } = useSWR<{ grid: SalahGrid }>(
    `/api/salah?week=${weekKey}`,
    fetcher
  );

  const grid = data?.grid ?? {};
  const days = getWeekDays(weekStart);
  const todayKey = formatDateKey(new Date());
  const maxWeek = startOfWeek(new Date());

  async function toggle(date: Date, prayer: PrayerName) {
    const dateKey = formatDateKey(date);
    const current = grid[dateKey]?.[prayer] ?? false;
    const res = await fetch('/api/salah', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: dateKey, prayer, completed: !current }),
    });
    if (res.ok) mutate();
  }

  return (
    <motion.section
      className="dawa-salah"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="dawa-salah__arch" aria-hidden />
      <div className="dawa-salah__body">
        <h2 className="dawa-salah__title">Weekly Salah</h2>
        <p className="dawa-salah__subtitle">مُتَابِعُ الصَّلَاة</p>
        <div className="dawa-salah__nav">
          <button type="button" className="dawa-salah__nav-btn" onClick={() => setWeekStart((w) => addDays(w, -7))} aria-label="Previous week">‹</button>
          <span className="dawa-salah__week">{formatWeekLabel(weekStart)}</span>
          <button type="button" className="dawa-salah__nav-btn" disabled={weekStart >= maxWeek} onClick={() => setWeekStart((w) => addDays(w, 7))} aria-label="Next week">›</button>
        </div>
        {isLoading ? (
          <p style={{ color: 'var(--text-soft)', fontSize: 13 }}>Loading…</p>
        ) : (
          <table className="dawa-salah-table">
            <thead>
              <tr>
                <th />
                {days.map((d) => {
                  const key = formatDateKey(d);
                  return (
                    <th key={key}>
                      <div className={`dawa-salah-day${key === todayKey ? ' is-today' : ''}`}>{d.getDate()}</div>
                      {d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1)}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {PRAYERS.map((prayer) => (
                <tr key={prayer}>
                  <td className="dawa-salah-row-label">
                    <span className="dawa-salah-row-en">{PRAYER_LABELS[prayer]}</span>
                    <span className="dawa-salah-row-ar">{PRAYER_ARABIC[prayer]}</span>
                  </td>
                  {days.map((d) => {
                    const key = formatDateKey(d);
                    const done = grid[key]?.[prayer] ?? false;
                    const isFuture = d > new Date();
                    return (
                      <td key={key}>
                        <motion.button
                          type="button"
                          className={`dawa-salah-prayer${done ? ' is-done' : ''}`}
                          disabled={isFuture}
                          onClick={() => toggle(d, prayer)}
                          whileTap={{ scale: 0.88 }}
                          aria-label={`${PRAYER_LABELS[prayer]} ${key}`}
                        >
                          {done ? '✓' : '○'}
                        </motion.button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </motion.section>
  );
}
