import { PRAYERS, type PrayerName } from './constants';
import { fetchPrayerTimes } from './prayer-times';
import { computePrayerInsightsCached } from './salah-day-stats';
import { addDays, formatDateKey, startOfDay } from './salah-utils';
import {
  classifyPrayerForDay,
  clampIman,
  dayLabel,
  type InsightFardRecord,
} from './prayer-insights-internal';

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

type FardRecord = InsightFardRecord;

async function computePrayerInsightsInline(
  records: FardRecord[],
  city: string,
  country: string,
  dayCount = 14,
): Promise<PrayerInsightsPayload> {
  const now = new Date();
  const today = startOfDay(now);
  const start = addDays(today, -(dayCount - 1));

  const fardRecords = records.filter((r) => PRAYERS.includes(r.prayer as PrayerName));

  // Pre-index records for O(1) lookup by date+prayer
  const recordIndex = new Map<string, Map<string, FardRecord>>();
  for (const r of fardRecords) {
    const dateKey = formatDateKey(r.date);
    let byPrayer = recordIndex.get(dateKey);
    if (!byPrayer) {
      byPrayer = new Map();
      recordIndex.set(dateKey, byPrayer);
    }
    byPrayer.set(r.prayer, r);
  }

  const timesCache = new Map<string, Awaited<ReturnType<typeof fetchPrayerTimes>>>();
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

    const byPrayer = recordIndex.get(key);
    let onTime = 0;
    let kaza = 0;
    let missed = 0;
    let pending = 0;
    const missedPrayers: PrayerName[] = [];

    for (const prayer of PRAYERS) {
      const rec = byPrayer?.get(prayer);
      const completed = rec?.completed ?? false;
      const loggedAt = completed && rec ? rec.updatedAt : null;
      const status = classifyPrayerForDay(
        d,
        prayer,
        completed,
        loggedAt,
        times,
        now,
        rec?.completedOnTime ?? false,
      );

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

export async function computePrayerInsights(
  records: FardRecord[],
  city: string,
  country: string,
  dayCount = 14,
  userId?: string,
): Promise<PrayerInsightsPayload> {
  if (userId) {
    return computePrayerInsightsCached(userId, records, city, country, dayCount);
  }
  return computePrayerInsightsInline(records, city, country, dayCount);
}
