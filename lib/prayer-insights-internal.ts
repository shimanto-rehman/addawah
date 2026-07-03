import { PRAYERS, type PrayerName } from './constants';
import {
  formatDateKeyInTimezone,
  getNowMinutesInTimezone,
  timeToMinutes,
  zonedMinutesToDate,
  type PrayerSlot,
  type PrayerTimesPayload,
} from './prayer-times';
import { formatDateKey } from './salah-utils';

export type SalahTimingStatus = 'on-time' | 'kaza' | 'missed' | 'pending';

export type InsightFardRecord = {
  date: Date;
  prayer: string;
  completed: boolean;
  updatedAt: Date;
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

export function classifyPrayerForDay(
  prayerDate: Date,
  prayer: PrayerName,
  completed: boolean,
  loggedAt: Date | null,
  times: PrayerTimesPayload,
  now: Date,
): SalahTimingStatus {
  const { start, end } = prayerWindow(prayer, times.prayers, times.sunrise);
  const dayKey = formatDateKey(prayerDate);
  const todayKey = formatDateKeyInTimezone(now, times.timeZone);
  const isToday = dayKey === todayKey;

  if (!completed) {
    if (isToday) {
      const { start, end } = prayerWindow(prayer, times.prayers, times.sunrise);
      const nowMins = getNowMinutesInTimezone(now, times.timeZone);
      if (nowMins < start) return 'pending';
      const waktEnd = zonedMinutesToDate(now, end, times.timeZone);
      if (now < waktEnd) return 'pending';
      return 'missed';
    }
    return 'missed';
  }

  if (!loggedAt) return 'kaza';

  const logKey = formatDateKey(loggedAt);
  const logMinutes = loggedAt.getHours() * 60 + loggedAt.getMinutes();

  if (logKey === dayKey) {
    if (logMinutes >= start && logMinutes < end) return 'on-time';
    return 'kaza';
  }

  if (logKey > dayKey) return 'kaza';
  return 'kaza';
}

export function dayLabel(date: Date) {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function clampIman(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
