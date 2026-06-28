import type { PrayerName } from './constants';
import {
  formatDateKeyInTimezone,
  getNowMinutesInTimezone,
  isPrayerTimesPayload,
  prayerWaktWindow,
  type PrayerTimesPayload,
} from './prayer-times';

export type SalahMarkBlockReason = 'future' | 'wakt-not-started';

export function canMarkSalahCell(
  prayerDateKey: string,
  prayer: PrayerName,
  times: PrayerTimesPayload,
  now = new Date(),
): { allowed: boolean; reason?: SalahMarkBlockReason } {
  const todayKey = formatDateKeyInTimezone(now, times.timeZone);

  if (prayerDateKey > todayKey) {
    return { allowed: false, reason: 'future' };
  }

  if (prayerDateKey < todayKey) {
    return { allowed: true };
  }

  const mins = getNowMinutesInTimezone(now, times.timeZone);
  const { start } = prayerWaktWindow(prayer, times);

  if (mins < start) {
    return { allowed: false, reason: 'wakt-not-started' };
  }

  return { allowed: true };
}

/** Client helper — uses local calendar date keys from the weekly grid. */
export function canMarkSalahCellLocal(
  prayerDateKey: string,
  todayDateKey: string,
  prayer: PrayerName,
  times: PrayerTimesPayload | undefined,
  now = new Date(),
): boolean {
  if (prayerDateKey > todayDateKey) return false;
  if (prayerDateKey < todayDateKey) return true;
  if (!times || !isPrayerTimesPayload(times)) return false;

  const mins = getNowMinutesInTimezone(now, times.timeZone);
  const { start } = prayerWaktWindow(prayer, times);
  return mins >= start;
}
