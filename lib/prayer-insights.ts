import { PRAYERS, type PrayerName } from './constants';
import {
  fetchPrayerTimes,
  timeToMinutes,
  type PrayerSlot,
  type PrayerTimesPayload,
} from './prayer-times';
import { addDays, formatDateKey, startOfDay } from './salah-utils';

export type SalahTimingStatus = 'on-time' | 'kaza' | 'missed' | 'pending';

export type DayInsight = {
  date: string;
  label: string;
  iman: number;
  onTime: number;
  kaza: number;
  missed: number;
  pending: number;
  missedPrayers: PrayerName[];
};

export type PrayerInsightsPayload = {
  days: DayInsight[];
  currentIman: number;
  trend: 'up' | 'down' | 'steady';
  totals: { onTime: number; kaza: number; missed: number };
};

type FardRecord = {
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

function classifyPrayer(
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

function dayLabel(date: Date) {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function clampIman(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export async function computePrayerInsights(
  records: FardRecord[],
  city: string,
  country: string,
  dayCount = 14,
): Promise<PrayerInsightsPayload> {
  const now = new Date();
  const today = startOfDay(now);
  const start = addDays(today, -(dayCount - 1));

  const fardRecords = records.filter((r) => PRAYERS.includes(r.prayer as PrayerName));

  const timesCache = new Map<string, PrayerTimesPayload>();
  const dates: Date[] = [];
  for (let d = new Date(start); d <= today; d = addDays(d, 1)) {
    dates.push(new Date(d));
  }

  await Promise.all(
    dates.map(async (d) => {
      const key = formatDateKey(d);
      try {
        const times = await fetchPrayerTimes(city, country, d);
        timesCache.set(key, times);
      } catch {
        timesCache.set(key, await fetchPrayerTimes(city, country, today));
      }
    }),
  );

  let iman = 68;
  const days: DayInsight[] = [];

  for (const d of dates) {
    const key = formatDateKey(d);
    const times = timesCache.get(key);
    if (!times) continue;

    let onTime = 0;
    let kaza = 0;
    let missed = 0;
    let pending = 0;
    const missedPrayers: PrayerName[] = [];

    for (const prayer of PRAYERS) {
      const rec = fardRecords.find(
        (r) => formatDateKey(r.date) === key && r.prayer === prayer,
      );
      const completed = rec?.completed ?? false;
      const loggedAt = completed && rec ? rec.updatedAt : null;
      const status = classifyPrayer(d, prayer, completed, loggedAt, times, now);

      if (status === 'on-time') {
        onTime += 1;
        iman += 4.2;
      } else if (status === 'kaza') {
        kaza += 1;
        iman -= 3.5;
      } else if (status === 'missed') {
        missed += 1;
        missedPrayers.push(prayer);
        iman -= 6;
      } else {
        pending += 1;
      }
    }

    iman = clampIman(iman);
    days.push({
      date: key,
      label: dayLabel(d),
      iman,
      onTime,
      kaza,
      missed,
      pending,
      missedPrayers,
    });
  }

  const totals = days.reduce(
    (acc, d) => ({
      onTime: acc.onTime + d.onTime,
      kaza: acc.kaza + d.kaza,
      missed: acc.missed + d.missed,
    }),
    { onTime: 0, kaza: 0, missed: 0 },
  );

  const currentIman = days.at(-1)?.iman ?? 68;
  const early = days.slice(0, 3).reduce((s, d) => s + d.iman, 0) / Math.max(1, Math.min(3, days.length));
  const late = days.slice(-3).reduce((s, d) => s + d.iman, 0) / Math.max(1, Math.min(3, days.length));
  const trend = late - early > 4 ? 'up' : late - early < -4 ? 'down' : 'steady';

  return { days, currentIman, trend, totals };
}
