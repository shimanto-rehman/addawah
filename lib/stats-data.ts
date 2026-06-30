import { prisma } from './prisma';
import {
  computeLifetimeStats,
  computeLifetimeSinceJoin,
  computeStreak,
  countCompleted,
  formatDateKey,
  isFardRecord,
  startOfWeek,
  addDays,
  startOfDay,
} from './salah-utils';
import { PRAYERS, PRAYER_LABELS, type PrayerName } from './constants';
import { cappedLifetimeRecordStart, SALAH_RECORD_STATS_SELECT } from './salah-query';
import { kvDel, kvGetJson, kvSetJson } from './kv';

const STATS_CACHE_TTL_SECONDS = 60;

export type StatsPayload = {
  weekCompleted: number;
  weekTotal: number;
  weekDays: number[];
  streak: number;
  lifetimeRate: number;
  todayCompleted: number;
  lifetimePrayed: number;
  lifetimeMissed: number;
  lifetimeExpected: number;
  activeDays: number;
  perfectDays: number;
  daysOnApp: number;
  fajrMissed: number;
  bestPrayer: { prayer: PrayerName; label: string; rate: number } | null;
  loggedCompleted: number;
};

function isStatsPayload(value: unknown): value is StatsPayload {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    typeof (value as StatsPayload).lifetimeRate === 'number'
  );
}

export async function buildStatsPayload(userId: string): Promise<StatsPayload> {
  const cacheKey = `stats:${userId}`;
  const cached = await kvGetJson<StatsPayload>(cacheKey);
  if (isStatsPayload(cached)) return cached;
  if (cached) await kvDel(cacheKey).catch(() => {});

  const today = startOfDay(new Date());
  const weekStart = startOfWeek(today);
  const weekEnd = addDays(weekStart, 6);
  const todayKey = formatDateKey(today);

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  });
  if (!dbUser) throw new Error('User not found');

  const recordStart = cappedLifetimeRecordStart(dbUser.createdAt, today);

  const [weekRecords, lifetimeRecords, todayRecords] = await Promise.all([
    prisma.salahRecord.findMany({
      where: { userId, date: { gte: weekStart, lte: weekEnd } },
      select: SALAH_RECORD_STATS_SELECT,
    }),
    prisma.salahRecord.findMany({
      where: { userId, date: { gte: recordStart, lte: today } },
      select: SALAH_RECORD_STATS_SELECT,
      orderBy: { date: 'asc' },
    }),
    prisma.salahRecord.findMany({
      where: {
        userId,
        date: today,
      },
      select: SALAH_RECORD_STATS_SELECT,
    }),
  ]);

  const weekTotal = 7 * PRAYERS.length;
  const lifetime = computeLifetimeStats(lifetimeRecords);
  const sinceJoin = computeLifetimeSinceJoin(dbUser.createdAt, lifetimeRecords);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    const key = formatDateKey(day);
    return weekRecords.filter(
      (r) => formatDateKey(r.date) === key && r.completed && isFardRecord(r),
    ).length;
  });

  const weekFard = weekRecords.filter(isFardRecord);
  const todayFard = todayRecords.filter(isFardRecord);

  const payload: StatsPayload = {
    weekCompleted: countCompleted(weekFard),
    weekTotal,
    weekDays,
    streak: computeStreak(lifetimeRecords),
    lifetimeRate: sinceJoin.lifetimeRate,
    todayCompleted: countCompleted(todayFard),
    lifetimePrayed: sinceJoin.lifetimePrayed,
    lifetimeMissed: sinceJoin.lifetimeMissed,
    lifetimeExpected: sinceJoin.lifetimeExpected,
    activeDays: sinceJoin.activeDays,
    perfectDays: sinceJoin.perfectDays,
    daysOnApp: sinceJoin.daysOnApp,
    fajrMissed: sinceJoin.missedByPrayer.FAJR,
    bestPrayer: sinceJoin.bestPrayer
      ? {
          prayer: sinceJoin.bestPrayer.prayer as PrayerName,
          label: PRAYER_LABELS[sinceJoin.bestPrayer.prayer as PrayerName],
          rate: sinceJoin.bestPrayer.rate,
        }
      : null,
    loggedCompleted: lifetime.completed,
  };

  // Cache in Redis for 60 seconds
  await kvSetJson(cacheKey, payload, STATS_CACHE_TTL_SECONDS);

  return payload;
}
