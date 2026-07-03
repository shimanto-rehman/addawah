'use client';

import { motion } from 'framer-motion';
import useSWR from 'swr';
import { useRef, useState, type ReactNode } from 'react';
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
  addDaysToKey,
  dayNumberFromKey,
  formatWeekLabelFromKeys,
  getSalahCell,
  rollingWeekStartKey,
  weekdayShortFromKey,
  weekDayKeys,
  type SalahCell,
  type SalahGrid,
} from '@/lib/salah-utils';
import { fireCelebrationConfetti } from '@/lib/confetti';
import type { StatsPayload } from '@/lib/stats-data';
import { canMarkSalahCellLocal } from '@/lib/salah-mark-rules';
import { useDashboardData } from '@/components/dashboard/DashboardDataProvider';
import type { PrayerTimesPayload } from '@/lib/prayer-times';
import { formatDateKeyInTimezone, isPrayerTimesPayload, prayerTimesFetcher } from '@/lib/prayer-times';
import { Shimmer } from '@/components/ui/Shimmer';

const DEFAULT_TIMEZONE = 'Asia/Dhaka';

const fetcher = (url: string) =>
  fetch(url, { cache: 'no-store' }).then((r) => {
    if (!r.ok) throw new Error('Failed to load salah');
    return r.json();
  });

type SalahPostResponse = {
  ok: boolean;
  coinsEarned?: number;
  stats?: StatsPayload;
};

type ToggleArgs = {
  dateKey: string;
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
  const toggleBusyRef = useRef<string | null>(null);
  const [busyCell, setBusyCell] = useState<string | null>(null);
  const [weekStartKey, setWeekStartKey] = useState(() => rollingWeekStartKey(DEFAULT_TIMEZONE));

  const { data: prayerTimes } = useSWR<PrayerTimesPayload>('/api/prayer-times', prayerTimesFetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  });

  const timeZone = isPrayerTimesPayload(prayerTimes) ? prayerTimes.timeZone : DEFAULT_TIMEZONE;
  const todayKey = formatDateKeyInTimezone(new Date(), timeZone);
  const currentWeekStartKey = rollingWeekStartKey(timeZone);
  const dayKeys = weekDayKeys(weekStartKey);

  const hubGrid =
    dashboard?.data?.weekKey === weekStartKey ? dashboard.data.grid : undefined;

  const { data, mutate, isLoading } = useSWR<{ grid: SalahGrid }>(
    `/api/salah?week=${weekStartKey}`,
    fetcher,
    {
      fallbackData: hubGrid ? { grid: hubGrid } : undefined,
      revalidateOnMount: !hubGrid,
      revalidateOnFocus: false,
    },
  );

  const grid = data?.grid ?? hubGrid ?? {};
  const gridLoading = isLoading && !data && !hubGrid;

  function isCellDisabled(dateKey: string, prayer: PrayerName) {
    return !canMarkSalahCellLocal(dateKey, todayKey, prayer, prayerTimes);
  }

  async function toggle({ dateKey, prayer, kind, unit = 0 }: ToggleArgs) {
    const opKey = `${dateKey}:${prayer}:${kind}:${unit}`;
    if (toggleBusyRef.current) return;
    toggleBusyRef.current = opKey;
    setBusyCell(opKey);

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

    const prevDashboard = dashboard?.data;

    try {
      await mutate({ grid: optimistic }, { revalidate: false });

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
      const payload = (await res.json()) as SalahPostResponse & { error?: string };
      if (!res.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Failed to save salah');
      }

      if (markingComplete && kind === 'FARD') fireCelebrationConfetti();

      const weekRes = await fetch(`/api/salah?week=${weekStartKey}`, { cache: 'no-store' });
      if (!weekRes.ok) throw new Error('Failed to refresh salah');
      const weekData = (await weekRes.json()) as { grid: SalahGrid };

      await mutate(weekData, { revalidate: false });

      if (dashboard?.data) {
        dashboard.mutate(
          {
            ...dashboard.data,
            grid: weekData.grid,
            weekKey: weekStartKey,
            ...(kind === 'FARD' && payload.stats ? { stats: payload.stats } : {}),
          },
          { revalidate: false },
        );
      }
    } catch {
      await mutate(undefined, { revalidate: true });
      if (kind === 'FARD' && prevDashboard) {
        dashboard!.mutate(prevDashboard, { revalidate: true });
      }
    } finally {
      toggleBusyRef.current = null;
      setBusyCell(null);
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
            onClick={() => setWeekStartKey((k) => addDaysToKey(k, -7))}
            aria-label="Previous week"
          >
            ‹
          </button>
          <span className="dawa-salah__week">{formatWeekLabelFromKeys(weekStartKey)}</span>
          <button
            type="button"
            className="dawa-salah__nav-btn"
            disabled={weekStartKey >= currentWeekStartKey}
            onClick={() => setWeekStartKey((k) => addDaysToKey(k, 7))}
            aria-label="Next week"
          >
            ›
          </button>
        </div>
        <div className="dawa-salah__body">
          {gridLoading ? (
            <div className="dawa-salah__shimmer">
              <div className="dawa-salah__shimmer-row">
                <Shimmer variant="text" width="60px" height="20px" />
                {Array.from({ length: 7 }, (_, i) => (
                  <Shimmer key={i} variant="rect" width="32px" height="32px" borderRadius="4px" />
                ))}
              </div>
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
                  {dayKeys.map((key) => (
                    <th key={key}>
                      <div className={`dawa-salah-day${key === todayKey ? ' is-today' : ''}`}>
                        <span className="dawa-num">{dayNumberFromKey(key)}</span>
                      </div>
                      {weekdayShortFromKey(key).slice(0, 1)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PRAYERS.map((prayer) => (
                  <tr key={prayer}>
                    <td className="dawa-salah-row-label">
                      <span className="dawa-salah-row-en">{PRAYER_LABELS[prayer]}</span>
                      <span className="dawa-salah-row-ar">{PRAYER_ARABIC[prayer]}</span>
                    </td>
                    {dayKeys.map((key) => {
                      const cell = getSalahCell(grid, key, prayer);
                      const disabled = isCellDisabled(key, prayer);
                      const cellKey = `${key}:${prayer}:FARD:0`;
                      const isBusy = busyCell === cellKey;
                      return (
                        <td key={key}>
                          <div className="dawa-salah-cell">
                            <div className="dawa-salah-cell__wing dawa-salah-cell__wing--before">
                              {cell.sunnahBefore.map((done, unit) => (
                                <SunnahToggle
                                  key={`b-${unit}`}
                                  done={done}
                                  disabled={disabled || busyCell === `${key}:${prayer}:SUNNAH_BEFORE:${unit}`}
                                  label={`${PRAYER_LABELS[prayer]} sunnah before ${key}`}
                                  tip={`${SUNNAH_UNIT_RAKATS} Rakats Sunnah`}
                                  onClick={() =>
                                    toggle({ dateKey: key, prayer, kind: 'SUNNAH_BEFORE', unit })
                                  }
                                />
                              ))}
                            </div>
                            <SalahHoverBubble label={`${FARD_RAKATS[prayer]} Rakats Fard`}>
                              <motion.button
                                type="button"
                                className={`dawa-salah-prayer${cell.fard ? ' is-done' : ''}${disabled && !cell.fard ? ' is-locked' : ''}${isBusy ? ' is-busy' : ''}`}
                                disabled={(disabled && !cell.fard) || isBusy}
                                onClick={() => toggle({ dateKey: key, prayer, kind: 'FARD' })}
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
                                  disabled={disabled || busyCell === `${key}:${prayer}:SUNNAH_AFTER:${unit}`}
                                  label={`${PRAYER_LABELS[prayer]} sunnah after ${key}`}
                                  tip={`${SUNNAH_UNIT_RAKATS} Rakats Sunnah`}
                                  onClick={() =>
                                    toggle({ dateKey: key, prayer, kind: 'SUNNAH_AFTER', unit })
                                  }
                                />
                              ))}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}
