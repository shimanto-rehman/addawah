import { prisma } from './prisma';
import {
  computeLifetimeSinceJoin,
  computeStreak,
  countCompleted,
  dateFromKey,
  dateKeyFromDbDate,
  getLifetimeMissedBreakdown,
  rollingWeekStartKey,
  weekDayKeys,
  weekRangeFromStartKey,
} from './salah-utils';
import { PRAYERS, PRAYER_LABELS, type PrayerName } from './constants';
import { cappedLifetimeRecordStart, SALAH_RECORD_STATS_SELECT } from './salah-query';
import { kvDel, kvGetJson, kvSetJson } from './kv';
import { fetchPrayerTimes, formatDateKeyInTimezone } from './prayer-times';

const STATS_CACHE_TTL_SECONDS = 5;

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
  sunnahPrayed: number;
  sunnahTotal: number;
  bestPrayer: { prayer: PrayerName; label: string; rate: number } | null;
  loggedCompleted: number;
  trackingSince: string | null;
  missedBreakdown: { date: string; prayer: PrayerName; label: string }[];
};

function isStatsPayload(value: unknown): value is StatsPayload {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    typeof (value as StatsPayload).lifetimeRate === 'number' &&
    Array.isArray((value as StatsPayload).missedBreakdown)
  );
}

export async function buildStatsPayload(
  userId: string,
  opts?: {
    skipCache?: boolean;
    /** Pre-fetched user info to avoid a duplicate DB query. */
    userInfo?: { createdAt: Date; city: string | null; country: string | null };
  },
): Promise<StatsPayload> {
  const cacheKey = `stats:${userId}`;
  if (!opts?.skipCache) {
    const cached = await kvGetJson<StatsPayload>(cacheKey);
    if (isStatsPayload(cached)) return cached;
    if (cached) await kvDel(cacheKey).catch(() => {});
  } else {
    await kvDel(cacheKey).catch(() => {});
  }

  const dbUser = opts?.userInfo ?? await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true, city: true, country: true },
  });
  if (!dbUser) throw new Error('User not found');

  const now = new Date();
  const city = dbUser.city?.trim() || 'Dhaka';
  const country = dbUser.country?.trim() || 'Bangladesh';
  const prayerTimes = await fetchPrayerTimes(city, country, now);
  const todayKey = formatDateKeyInTimezone(now, prayerTimes.timeZone);
  const todayDate = dateFromKey(todayKey);
  const weekStartKey = rollingWeekStartKey(prayerTimes.timeZone, now);
  const { start: weekStart, end: weekEnd } = weekRangeFromStartKey(weekStartKey);

  const recordStart = cappedLifetimeRecordStart(dbUser.createdAt, todayDate);

  const sunnahWhere = { userId, date: { gte: recordStart, lte: todayDate }, kind: { in: ['SUNNAH_BEFORE' as const, 'SUNNAH_AFTER' as const] } };

  const [weekRecords, lifetimeRecords, todayRecords, sunnahPrayed, sunnahTotal] = await Promise.all([
    prisma.salahRecord.findMany({
      where: { userId, date: { gte: weekStart, lte: weekEnd }, kind: 'FARD' },
      select: SALAH_RECORD_STATS_SELECT,
    }),
    prisma.salahRecord.findMany({
      where: { userId, date: { gte: recordStart, lte: todayDate }, kind: 'FARD' },
      select: SALAH_RECORD_STATS_SELECT,
      orderBy: { date: 'asc' },
    }),
    prisma.salahRecord.findMany({
      where: {
        userId,
        date: todayDate,
        kind: 'FARD',
      },
      select: SALAH_RECORD_STATS_SELECT,
    }),
    prisma.salahRecord.count({ where: { ...sunnahWhere, completed: true } }),
    prisma.salahRecord.count({ where: sunnahWhere }),
  ]);

  const weekTotal = 7 * PRAYERS.length;
  const sinceJoin = computeLifetimeSinceJoin(dbUser.createdAt, lifetimeRecords, prayerTimes, now);
  const { missed: missedBreakdown, trackingSince } = getLifetimeMissedBreakdown(
    lifetimeRecords,
    prayerTimes,
    now,
    sinceJoin.missedByPrayer,
  );

  const weekDays = weekDayKeys(weekStartKey).map((key) =>
    weekRecords.filter((r) => dateKeyFromDbDate(r.date) === key && r.completed).length,
  );

  const payload: StatsPayload = {
    weekCompleted: countCompleted(weekRecords),
    weekTotal,
    weekDays,
    streak: computeStreak(lifetimeRecords),
    lifetimeRate: sinceJoin.lifetimeRate,
    todayCompleted: countCompleted(todayRecords),
    lifetimePrayed: sinceJoin.lifetimePrayed,
    lifetimeMissed: sinceJoin.lifetimeMissed,
    lifetimeExpected: sinceJoin.lifetimeExpected,
    activeDays: sinceJoin.activeDays,
    perfectDays: sinceJoin.perfectDays,
    daysOnApp: sinceJoin.daysOnApp,
    sunnahPrayed,
    sunnahTotal,
    bestPrayer: sinceJoin.bestPrayer
      ? {
          prayer: sinceJoin.bestPrayer.prayer as PrayerName,
          label: PRAYER_LABELS[sinceJoin.bestPrayer.prayer as PrayerName],
          rate: sinceJoin.bestPrayer.rate,
        }
      : null,
    loggedCompleted: sinceJoin.lifetimePrayed,
    trackingSince,
    missedBreakdown,
  };

  // Cache in Redis for 60 seconds
  await kvSetJson(cacheKey, payload, STATS_CACHE_TTL_SECONDS);

  return payload;
}
