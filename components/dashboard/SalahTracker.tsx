'use client';

import { motion } from 'framer-motion';
import useSWR from 'swr';
import { useState } from 'react';
import {
  PRAYERS,
  PRAYER_LABELS,
  PRAYER_ARABIC,
  type PrayerName,
  type SalahKind,
} from '@/lib/constants';
import {
  addDays,
  formatDateKey,
  formatWeekLabel,
  getSalahCell,
  getWeekDays,
  startOfDay,
  startOfWeek,
  type SalahCell,
  type SalahGrid,
} from '@/lib/salah-utils';
import { fireCelebrationConfetti } from '@/lib/confetti';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type ToggleArgs = {
  date: Date;
  prayer: PrayerName;
  kind: SalahKind;
  unit?: number;
};

function SunnahToggle({
  done,
  disabled,
  label,
  onClick,
}: {
  done: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      className={`dawa-salah-sunnah${done ? ' is-done' : ''}`}
      disabled={disabled}
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      aria-label={label}
      aria-pressed={done}
    >
      {done ? '✓' : ''}
    </motion.button>
  );
}

export function SalahTracker() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const weekKey = formatDateKey(weekStart);

  const { data, mutate, isLoading } = useSWR<{ grid: SalahGrid }>(
    `/api/salah?week=${weekKey}`,
    fetcher,
  );

  const grid = data?.grid ?? {};
  const days = getWeekDays(weekStart);
  const todayKey = formatDateKey(new Date());
  const maxWeek = startOfWeek(new Date());

  async function toggle({ date, prayer, kind, unit = 0 }: ToggleArgs) {
    const dateKey = formatDateKey(date);
    const cell = getSalahCell(grid, dateKey, prayer);
    const current =
      kind === 'FARD'
        ? cell.fard
        : kind === 'SUNNAH_BEFORE'
          ? (cell.sunnahBefore[unit] ?? false)
          : (cell.sunnahAfter[unit] ?? false);
    const markingComplete = !current;

    const nextCell: SalahCell = {
      fard: cell.fard,
      sunnahBefore: [...cell.sunnahBefore],
      sunnahAfter: [...cell.sunnahAfter],
    };
    if (kind === 'FARD') nextCell.fard = markingComplete;
    else if (kind === 'SUNNAH_BEFORE') nextCell.sunnahBefore[unit] = markingComplete;
    else nextCell.sunnahAfter[unit] = markingComplete;

    const optimistic: SalahGrid = {
      ...grid,
      [dateKey]: {
        ...grid[dateKey],
        [prayer]: nextCell,
      },
    };

    try {
      await mutate(
        async (currentData) => {
          const res = await fetch('/api/salah', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date: dateKey,
              prayer,
              kind,
              unit,
              completed: markingComplete,
            }),
          });
          if (!res.ok) throw new Error('Failed to save salah');
          if (markingComplete && kind === 'FARD') fireCelebrationConfetti();
          return currentData;
        },
        {
          optimisticData: { grid: optimistic },
          rollbackOnError: true,
          revalidate: true,
        },
      );
    } catch {
      /* rollback handled by SWR */
    }
  }

  return (
    <motion.section
      className="dawa-salah"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="dawa-salah__card">
        <div className="dawa-salah__banner">
          <div className="dawa-salah__banner-bg" aria-hidden />
          <div className="dawa-salah__banner-content">
            <h2 className="dawa-salah__title">Weekly Salah</h2>
            <p className="dawa-salah__subtitle">مُتَابِعُ الصَّلَاة</p>
          </div>
        </div>
        <div className="dawa-salah__nav">
          <button
            type="button"
            className="dawa-salah__nav-btn"
            onClick={() => setWeekStart((w) => addDays(w, -7))}
            aria-label="Previous week"
          >
            ‹
          </button>
          <span className="dawa-salah__week">{formatWeekLabel(weekStart)}</span>
          <button
            type="button"
            className="dawa-salah__nav-btn"
            disabled={weekStart >= maxWeek}
            onClick={() => setWeekStart((w) => addDays(w, 7))}
            aria-label="Next week"
          >
            ›
          </button>
        </div>
        <div className="dawa-salah__body">
          {isLoading ? (
            <p className="dawa-salah__loading">Loading…</p>
          ) : (
            <table className="dawa-salah-table">
              <thead>
                <tr>
                  <th />
                  {days.map((d) => {
                    const key = formatDateKey(d);
                    return (
                      <th key={key}>
                        <div className={`dawa-salah-day${key === todayKey ? ' is-today' : ''}`}>
                          {d.getDate()}
                        </div>
                        {d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1)}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {PRAYERS.map((prayer) => {
                  return (
                    <tr key={prayer}>
                      <td className="dawa-salah-row-label">
                        <span className="dawa-salah-row-en">{PRAYER_LABELS[prayer]}</span>
                        <span className="dawa-salah-row-ar">{PRAYER_ARABIC[prayer]}</span>
                      </td>
                      {days.map((d) => {
                        const key = formatDateKey(d);
                        const cell = getSalahCell(grid, key, prayer);
                        const isFuture = startOfDay(d) > startOfDay(new Date());
                        return (
                          <td key={key}>
                            <div className="dawa-salah-cell">
                              <div className="dawa-salah-cell__wing dawa-salah-cell__wing--before">
                                {cell.sunnahBefore.map((done, unit) => (
                                  <SunnahToggle
                                    key={`b-${unit}`}
                                    done={done}
                                    disabled={isFuture}
                                    label={`${PRAYER_LABELS[prayer]} sunnah before ${key}`}
                                    onClick={() =>
                                      toggle({ date: d, prayer, kind: 'SUNNAH_BEFORE', unit })
                                    }
                                  />
                                ))}
                              </div>
                              <motion.button
                                type="button"
                                className={`dawa-salah-prayer${cell.fard ? ' is-done' : ''}`}
                                disabled={isFuture}
                                onClick={() => toggle({ date: d, prayer, kind: 'FARD' })}
                                whileTap={{ scale: 0.88 }}
                                aria-label={`${PRAYER_LABELS[prayer]} fard ${key}`}
                              >
                                {cell.fard ? '✓' : '○'}
                              </motion.button>
                              <div className="dawa-salah-cell__wing dawa-salah-cell__wing--after">
                                {cell.sunnahAfter.map((done, unit) => (
                                  <SunnahToggle
                                    key={`a-${unit}`}
                                    done={done}
                                    disabled={isFuture}
                                    label={`${PRAYER_LABELS[prayer]} sunnah after ${key}`}
                                    onClick={() =>
                                      toggle({ date: d, prayer, kind: 'SUNNAH_AFTER', unit })
                                    }
                                  />
                                ))}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </motion.section>
  );
}
