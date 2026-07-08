import { PRAYERS, type PrayerName } from './constants';
import {
  formatDateKeyInTimezone,
  getNowMinutesInTimezone,
  timeToMinutes,
  zonedMinutesToDate,
  type PrayerSlot,
  type PrayerTimesPayload,
} from './prayer-times';
import { dateKeyFromDbDate } from './salah-utils';

export type SalahTimingStatus = 'on-time' | 'kaza' | 'missed' | 'pending';

export type InsightFardRecord = {
  date: Date;
  prayer: string;
  completed: boolean;
  updatedAt: Date;
  completedOnTime?: boolean;
  inJamat?: boolean;
};

function prayerWindow(
  prayer: PrayerName,
  prayers: PrayerSlot[],
  sunrise: string,
): { start: number; end: number } {
  const idx = PRAYERS.indexOf(prayer);
  const start = prayers[idx].minutes;

  if (prayer === 'FAJR') {
    return { start, end: timeToMinutes(sunrise) };
  }
  if (prayer === 'ISHA') {
    return { start, end: 24 * 60 };
  }
  return { start, end: prayers[idx + 1].minutes };
}

export function isMarkWithinWakt(
  markedAt: Date,
  prayerDateKey: string,
  prayer: PrayerName,
  times: PrayerTimesPayload,
): boolean {
  const logKey = formatDateKeyInTimezone(markedAt, times.timeZone);
  if (logKey !== prayerDateKey) return false;
  const logMinutes = getNowMinutesInTimezone(markedAt, times.timeZone);
  const { start, end } = prayerWindow(prayer, times.prayers, times.sunrise);
  return logMinutes >= start && logMinutes < end;
}

export function classifyPrayerForDay(
  prayerDate: Date,
  prayer: PrayerName,
  completed: boolean,
  loggedAt: Date | null,
  times: PrayerTimesPayload,
  now: Date,
  completedOnTime = false,
): SalahTimingStatus {
  const { start, end } = prayerWindow(prayer, times.prayers, times.sunrise);
  const dayKey = dateKeyFromDbDate(prayerDate);
  const todayKey = formatDateKeyInTimezone(now, times.timeZone);
  const isToday = dayKey === todayKey;

  if (!completed) {
    if (isToday) {
      const nowMins = getNowMinutesInTimezone(now, times.timeZone);
      if (nowMins < start) return 'pending';
      const waktEnd = zonedMinutesToDate(now, end, times.timeZone);
      if (now < waktEnd) return 'pending';
      return 'missed';
    }
    return 'missed';
  }

  if (completedOnTime) return 'on-time';

  if (!loggedAt) return 'kaza';

  const logKey = formatDateKeyInTimezone(loggedAt, times.timeZone);
  const logMinutes = getNowMinutesInTimezone(loggedAt, times.timeZone);

  if (logKey === dayKey) {
    if (logMinutes >= start && logMinutes < end) return 'on-time';
    return 'kaza';
  }

  if (logKey > dayKey) return 'kaza';
  return 'kaza';
}

/** Classify a fard mark at the moment the user toggles it complete. */
export function classifySalahMark(
  prayerDateKey: string,
  prayer: PrayerName,
  markedAt: Date,
  times: PrayerTimesPayload,
  everOnTime = false,
): 'on-time' | 'kaza' {
  if (everOnTime) return 'on-time';
  const prayerDate = new Date(`${prayerDateKey}T00:00:00.000Z`);
  const status = classifyPrayerForDay(prayerDate, prayer, true, markedAt, times, markedAt);
  return status === 'on-time' ? 'on-time' : 'kaza';
}

export function dayLabel(date: Date) {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function clampIman(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
