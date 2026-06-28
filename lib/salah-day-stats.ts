import type { PrayerName } from './constants';
import { PRAYERS } from './constants';
import { fetchPrayerTimes, type PrayerTimesPayload } from './prayer-times';
import type { DayInsight, PrayerInsightsPayload } from './prayer-insights';
import {
  classifyPrayerForDay,
  clampIman,
  dayLabel,
  type InsightFardRecord,
} from './prayer-insights-internal';
import { prisma } from './prisma';
import { addDays, formatDateKey, startOfDay } from './salah-utils';

type DayStatRow = {
  userId: string;
  date: Date;
  onTime: number;
  kaza: number;
  missed: number;
  pending: number;
  iman: number;
  missedPrayers: unknown;
  refreshedAt: Date;
};

function statToDayInsight(row: DayStatRow, date: Date): DayInsight {
  const missedPrayers = Array.isArray(row.missedPrayers)
    ? (row.missedPrayers as PrayerName[])
    : [];
  return {
    date: formatDateKey(date),
    label: dayLabel(date),
    iman: row.iman,
    onTime: row.onTime,
    kaza: row.kaza,
    missed: row.missed,
    pending: row.pending,
    missedPrayers,
  };
}

function computeDayInsight(
  date: Date,
  records: InsightFardRecord[],
  times: PrayerTimesPayload,
  now: Date,
  imanStart: number,
): { insight: DayInsight; imanEnd: number } {
  const key = formatDateKey(date);
  let iman = imanStart;
  let onTime = 0;
  let kaza = 0;
  let missed = 0;
  let pending = 0;
  const missedPrayers: PrayerName[] = [];

  for (const prayer of PRAYERS) {
    const rec = records.find((r) => formatDateKey(r.date) === key && r.prayer === prayer);
    const completed = rec?.completed ?? false;
    const loggedAt = completed && rec ? rec.updatedAt : null;
    const status = classifyPrayerForDay(date, prayer, completed, loggedAt, times, now);

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
  return {
    insight: {
      date: key,
      label: dayLabel(date),
      iman,
      onTime,
      kaza,
      missed,
      pending,
      missedPrayers,
    },
    imanEnd: iman,
  };
}

function buildPayloadFromDays(days: DayInsight[]): PrayerInsightsPayload {
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

function recordsForDate(records: InsightFardRecord[], dateKey: string) {
  return records.filter((r) => formatDateKey(r.date) === dateKey);
}

function latestRecordTouch(records: InsightFardRecord[], dateKey: string) {
  let latest = 0;
  for (const record of recordsForDate(records, dateKey)) {
    const ts = record.updatedAt.getTime();
    if (ts > latest) latest = ts;
  }
  return latest;
}

export async function ensureSalahDayStats(
  userId: string,
  records: InsightFardRecord[],
  city: string,
  country: string,
  dayCount = 14,
): Promise<DayInsight[]> {
  const now = new Date();
  const today = startOfDay(now);
  const todayKey = formatDateKey(today);
  const start = addDays(today, -(dayCount - 1));

  const dates: Date[] = [];
  for (let d = new Date(start); d <= today; d = addDays(d, 1)) {
    dates.push(new Date(d));
  }

  const existing = await prisma.userSalahDayStat.findMany({
    where: {
      userId,
      date: { gte: start, lte: today },
    },
  });
  const statByKey = new Map(existing.map((row) => [formatDateKey(row.date), row as DayStatRow]));

  const datesNeedingTimes = dates.filter((d) => {
    const key = formatDateKey(d);
    const stat = statByKey.get(key);
    const touch = latestRecordTouch(records, key);
    const stale = !stat || key === todayKey || touch > stat.refreshedAt.getTime();
    return stale;
  });

  const timesCache = new Map<string, PrayerTimesPayload>();
  await Promise.all(
    datesNeedingTimes.map(async (d) => {
      const key = formatDateKey(d);
      try {
        timesCache.set(key, await fetchPrayerTimes(city, country, d));
      } catch {
        if (!timesCache.has(todayKey)) {
          timesCache.set(todayKey, await fetchPrayerTimes(city, country, today));
        }
        timesCache.set(key, timesCache.get(todayKey)!);
      }
    }),
  );

  let iman = 68;
  const days: DayInsight[] = [];

  for (const d of dates) {
    const key = formatDateKey(d);
    const stat = statByKey.get(key);
    const touch = latestRecordTouch(records, key);
    const stale = !stat || key === todayKey || touch > stat.refreshedAt.getTime();

    if (!stale && stat) {
      days.push(statToDayInsight(stat, d));
      iman = stat.iman;
      continue;
    }

    const times = timesCache.get(key) ?? timesCache.get(todayKey);
    if (!times) continue;

    const { insight, imanEnd } = computeDayInsight(d, records, times, now, iman);
    iman = imanEnd;
    days.push(insight);

    await prisma.userSalahDayStat.upsert({
      where: { userId_date: { userId, date: d } },
      create: {
        userId,
        date: d,
        onTime: insight.onTime,
        kaza: insight.kaza,
        missed: insight.missed,
        pending: insight.pending,
        iman: insight.iman,
        missedPrayers: insight.missedPrayers,
        refreshedAt: now,
      },
      update: {
        onTime: insight.onTime,
        kaza: insight.kaza,
        missed: insight.missed,
        pending: insight.pending,
        iman: insight.iman,
        missedPrayers: insight.missedPrayers,
        refreshedAt: now,
      },
    });
  }

  return days;
}

export async function computePrayerInsightsCached(
  userId: string,
  records: InsightFardRecord[],
  city: string,
  country: string,
  dayCount = 14,
): Promise<PrayerInsightsPayload> {
  const days = await ensureSalahDayStats(userId, records, city, country, dayCount);
  return buildPayloadFromDays(days);
}

export async function refreshSalahDayStatForUser(userId: string, dateKey: string, now = new Date()) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { city: true, country: true },
  });
  if (!user) return;

  const city = user.city?.trim() || 'Dhaka';
  const country = user.country?.trim() || 'Bangladesh';
  const date = new Date(`${dateKey}T12:00:00`);

  const records = await prisma.salahRecord.findMany({
    where: { userId, kind: 'FARD', date },
    select: { date: true, prayer: true, completed: true, updatedAt: true },
  });

  const prior = await prisma.userSalahDayStat.findFirst({
    where: { userId, date: { lt: date } },
    orderBy: { date: 'desc' },
  });

  const times = await fetchPrayerTimes(city, country, date);
  const { insight } = computeDayInsight(
    date,
    records,
    times,
    now,
    prior?.iman ?? 68,
  );

  await prisma.userSalahDayStat.upsert({
    where: { userId_date: { userId, date } },
    create: {
      userId,
      date,
      onTime: insight.onTime,
      kaza: insight.kaza,
      missed: insight.missed,
      pending: insight.pending,
      iman: insight.iman,
      missedPrayers: insight.missedPrayers,
      refreshedAt: now,
    },
    update: {
      onTime: insight.onTime,
      kaza: insight.kaza,
      missed: insight.missed,
      pending: insight.pending,
      iman: insight.iman,
      missedPrayers: insight.missedPrayers,
      refreshedAt: now,
    },
  });
}
