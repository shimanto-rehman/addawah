import { addDays, startOfDay } from './salah-utils';

/** Minimal fields for streak, lifetime, and weekly stats. */
export const SALAH_RECORD_STATS_SELECT = {
  date: true,
  prayer: true,
  kind: true,
  completed: true,
  inJamat: true,
} as const;

/** Cap lifetime scans to 12 months or account age — keeps queries bounded. */
export function cappedLifetimeRecordStart(joinedAt: Date, today: Date) {
  const joined = startOfDay(joinedAt);
  const yearAgo = addDays(today, -365);
  return joined > yearAgo ? joined : yearAgo;
}

export const DASHBOARD_CACHE_HEADERS = {
  'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
};

/** Salah grid must stay fresh — toggles are interactive. */
export const SALAH_GRID_CACHE_HEADERS = {
  'Cache-Control': 'private, no-store, must-revalidate',
};
