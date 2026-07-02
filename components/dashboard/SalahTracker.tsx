'use client';

import { motion } from 'framer-motion';
import useSWR from 'swr';
import { useState, type ReactNode } from 'react';
import {
  PRAYERS,
  PRAYER_LABELS,
  PRAYER_ARABIC,
  FARD_RAKATS,
  SUNNAH_UNIT_RAKATS,
  type PrayerName,
  type SalahKind,
} from '@/lib/constants';
import {
  addDays,
  formatDateKeyLocal,
  formatWeekLabel,
  getSalahCell,
  getWeekDays,
  rollingWeekStart,
  type SalahCell,
  type SalahGrid,
} from '@/lib/salah-utils';
import { fireCelebrationConfetti } from '@/lib/confetti';
import { revalidateDashboardMetrics } from '@/lib/swr-revalidate';
import { canMarkSalahCellLocal } from '@/lib/salah-mark-rules';
import { useDashboardData } from '@/components/dashboard/DashboardDataProvider';
import type { PrayerTimesPayload } from '@/lib/prayer-times';
import { formatDateKeyInTimezone, isPrayerTimesPayload, prayerTimesFetcher } from '@/lib/prayer-times';
import { Shimmer } from '@/components/ui/Shimmer';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type ToggleArgs = {
  date: Date;
  prayer: PrayerName;
  kind: SalahKind;
  unit?: number;
};

function SalahHoverBubble({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <span className="dawa-salah-tip">
      {children}
      <span className="dawa-salah-tip__bubble" role="tooltip">
        {label}
      </span>
    </span>
  );
}

function SunnahToggle({
  done,
  disabled,
  label,
  tip,
  onClick,
}: {
  done: boolean;
  disabled: boolean;
  label: string;
  tip: string;
  onClick: () => void;
}) {
  return (
    <SalahHoverBubble label={tip}>
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
    </SalahHoverBubble>
  );
}

export function SalahTracker() {
  const dashboard = useDashboardData();
  const [weekStart, setWeekStart] = useState(() => rollingWeekStart(new Date()));
  const weekKey = formatDateKeyLocal(weekStart);
  const hubGrid =
    dashboard?.data?.weekKey === weekKey ? dashboard.data.grid : undefined;

  const { data, mutate, isLoading } = useSWR<{ grid: SalahGrid }>(
    `/api/salah?week=${weekKey}`,
    fetcher,
    {
      fallbackData: hubGrid ? { grid: hubGrid } : undefined,
      revalidateOnMount: !hubGrid,
      revalidateOnFocus: false,
    },
  );

  const { data: prayerTimes } = useSWR<PrayerTimesPayload>('/api/prayer-times', prayerTimesFetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  });

  const grid = data?.grid ?? hubGrid ?? {};
  const gridLoading = isLoading && !data && !hubGrid;
  const days = getWeekDays(weekStart);
  const todayKey = isPrayerTimesPayload(prayerTimes)
    ? formatDateKeyInTimezone(new Date(), prayerTimes.timeZone)
    : formatDateKeyLocal(new Date());
  const maxWeek = rollingWeekStart(new Date());

  function isCellDisabled(day: Date, prayer: PrayerName) {
    const key = formatDateKeyLocal(day);
    return !canMarkSalahCellLocal(key, todayKey, prayer, prayerTimes);
  }

  async function toggle({ date, prayer, kind, unit = 0 }: ToggleArgs) {
    const dateKey = formatDateKeyLocal(date);
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
        async () => {
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
          if (kind === 'FARD') await revalidateDashboardMetrics();
          const weekRes = await fetch(`/api/salah?week=${weekKey}`);
          if (!weekRes.ok) throw new Error('Failed to refresh salah');
          return weekRes.json();
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
    <section className="dawa-salah">
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
          {gridLoading ? (
            <div className="dawa-salah__shimmer">
              {/* Header row */}
              <div className="dawa-salah__shimmer-row">
                <Shimmer variant="text" width="60px" height="20px" />
                {Array.from({ length: 7 }, (_, i) => (
                  <Shimmer key={i} variant="rect" width="32px" height="32px" borderRadius="4px" />
                ))}
              </div>
              {/* Prayer rows */}
              {Array.from({ length: 5 }, (_, row) => (
                <div key={row} className="dawa-salah__shimmer-row">
                  <Shimmer variant="text" width="50px" height="16px" />
                  {Array.from({ length: 7 }, (_, col) => (
                    <Shimmer key={col} variant="circle" width="28px" height="28px" />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <table className="dawa-salah-table">
              <thead>
                <tr>
                  <th />
                  {days.map((d) => {
                    const key = formatDateKeyLocal(d);
                    return (
                      <th key={key}>
                        <div className={`dawa-salah-day${key === todayKey ? ' is-today' : ''}`}>
                          <span className="dawa-num">{d.getDate()}</span>
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
                        const key = formatDateKeyLocal(d);
                        const cell = getSalahCell(grid, key, prayer);
                        const disabled = isCellDisabled(d, prayer);
                        return (
                          <td key={key}>
                            <div className="dawa-salah-cell">
                              <div className="dawa-salah-cell__wing dawa-salah-cell__wing--before">
                                {cell.sunnahBefore.map((done, unit) => (
                                  <SunnahToggle
                                    key={`b-${unit}`}
                                    done={done}
                                    disabled={disabled}
                                    label={`${PRAYER_LABELS[prayer]} sunnah before ${key}`}
                                    tip={`${SUNNAH_UNIT_RAKATS} Rakats Sunnah`}
                                    onClick={() =>
                                      toggle({ date: d, prayer, kind: 'SUNNAH_BEFORE', unit })
                                    }
                                  />
                                ))}
                              </div>
                              <SalahHoverBubble label={`${FARD_RAKATS[prayer]} Rakats Fard`}>
                                <motion.button
                                  type="button"
                                  className={`dawa-salah-prayer${cell.fard ? ' is-done' : ''}${disabled && !cell.fard ? ' is-locked' : ''}`}
                                  disabled={disabled && !cell.fard}
                                  onClick={() => toggle({ date: d, prayer, kind: 'FARD' })}
                                  whileTap={{ scale: 0.88 }}
                                  aria-label={`${PRAYER_LABELS[prayer]} fard ${key}`}
                                  title={
                                    disabled && !cell.fard
                                      ? key === todayKey
                                        ? 'Wakt has not started yet'
                                        : 'Future day'
                                      : undefined
                                  }
                                >
                                  {cell.fard ? '✓' : '○'}
                                </motion.button>
                              </SalahHoverBubble>
                              <div className="dawa-salah-cell__wing dawa-salah-cell__wing--after">
                                {cell.sunnahAfter.map((done, unit) => (
                                  <SunnahToggle
                                    key={`a-${unit}`}
                                    done={done}
                                    disabled={disabled}
                                    label={`${PRAYER_LABELS[prayer]} sunnah after ${key}`}
                                    tip={`${SUNNAH_UNIT_RAKATS} Rakats Sunnah`}
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
    </section>
  );
}
