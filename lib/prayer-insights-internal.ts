import { PRAYERS, type PrayerName } from './constants';
import {
  timeToMinutes,
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

function windowEndDate(prayerDate: Date, endMinutes: number) {
  const end = new Date(prayerDate);
  const hours = Math.floor(endMinutes / 60);
  const mins = endMinutes % 60;
  end.setHours(hours, mins, 0, 0);
  return end;
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
  const waktEnd = windowEndDate(prayerDate, end);
  const dayKey = formatDateKey(prayerDate);
  const todayKey = formatDateKey(now);
  const isToday = dayKey === todayKey;

  if (!completed) {
    if (isToday && now < waktEnd) return 'pending';
    if (now >= waktEnd || dayKey < todayKey) return 'missed';
    return 'pending';
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
