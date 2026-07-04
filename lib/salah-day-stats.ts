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
  recordIndex: Map<string, Map<string, InsightFardRecord>>,
  times: PrayerTimesPayload,
  now: Date,
  imanStart: number,
): { insight: DayInsight; imanEnd: number } {
  const key = formatDateKey(date);
  const byPrayer = recordIndex.get(key);
  let iman = imanStart;
  let onTime = 0;
  let kaza = 0;
  let missed = 0;
  let pending = 0;
  const missedPrayers: PrayerName[] = [];

  for (const prayer of PRAYERS) {
    const rec = byPrayer?.get(prayer);
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

  // Pre-index records for O(1) lookup by date+prayer
  const recordIndex = new Map<string, Map<string, InsightFardRecord>>();
  for (const r of records) {
    const dateKey = formatDateKey(r.date);
    let byPrayer = recordIndex.get(dateKey);
    if (!byPrayer) {
      byPrayer = new Map();
      recordIndex.set(dateKey, byPrayer);
    }
    byPrayer.set(r.prayer, r);
  }

  const datesNeedingTimes = dates.filter((d) => {
    const key = formatDateKey(d);
    const stat = statByKey.get(key);
    const byPrayer = recordIndex.get(key);
    let touch = 0;
    if (byPrayer) {
      for (const rec of Array.from(byPrayer.values())) {
        const ts = rec.updatedAt.getTime();
        if (ts > touch) touch = ts;
      }
    }
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

  // Pass 1: compute all insights (iman chain is sequential)
  let iman = 68;
  const days: DayInsight[] = [];
  const staleInsights: { d: Date; insight: DayInsight }[] = [];

  for (const d of dates) {
    const key = formatDateKey(d);
    const stat = statByKey.get(key);
    const byPrayer = recordIndex.get(key);
    let latestTouch = 0;
    if (byPrayer) {
      for (const rec of Array.from(byPrayer.values())) {
        const ts = rec.updatedAt.getTime();
        if (ts > latestTouch) latestTouch = ts;
      }
    }
    const stale = !stat || key === todayKey || latestTouch > stat.refreshedAt.getTime();

    if (!stale && stat) {
      days.push(statToDayInsight(stat, d));
      iman = stat.iman;
      continue;
    }

    const times = timesCache.get(key) ?? timesCache.get(todayKey);
    if (!times) continue;

    const { insight, imanEnd } = computeDayInsight(d, recordIndex, times, now, iman);
    iman = imanEnd;
    days.push(insight);
    staleInsights.push({ d, insight });
  }

  // Pass 2: batch all upserts in parallel (was sequential await per day)
  if (staleInsights.length > 0) {
    await Promise.all(
      staleInsights.map(({ d, insight }) =>
        prisma.userSalahDayStat.upsert({
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
        }),
      ),
    );
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
  // Build record index for O(1) lookup
  const recordIndex = new Map<string, Map<string, InsightFardRecord>>();
  const byPrayer = new Map<string, InsightFardRecord>();
  for (const r of records) {
    byPrayer.set(r.prayer, r as InsightFardRecord);
  }
  recordIndex.set(dateKey, byPrayer);

  const { insight } = computeDayInsight(
    date,
    recordIndex,
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
