import { prisma } from '@/lib/prisma';
import { apiRequireAuth, jsonOk } from '@/lib/api-helpers';
import {
  computeLifetimeStats,
  computeLifetimeSinceJoin,
  computeStreak,
  countCompleted,
  formatDateKey,
  isFardRecord,
  startOfWeek,
  addDays,
} from '@/lib/salah-utils';
import { PRAYERS, PRAYER_LABELS, type PrayerName } from '@/lib/constants';

export async function GET() {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const weekStart = startOfWeek(new Date());
  const weekEnd = addDays(weekStart, 6);
  const todayKey = formatDateKey(new Date());

  const [weekRecords, allRecords, todayRecords, dbUser] = await Promise.all([
    prisma.salahRecord.findMany({
      where: { userId: user!.id, date: { gte: weekStart, lte: weekEnd } },
    }),
    prisma.salahRecord.findMany({ where: { userId: user!.id } }),
    prisma.salahRecord.findMany({
      where: {
        userId: user!.id,
        date: new Date(todayKey + 'T12:00:00'),
      },
    }),
    prisma.user.findUnique({
      where: { id: user!.id },
      select: { createdAt: true },
    }),
  ]);

  const weekTotal = 7 * PRAYERS.length;
  const lifetime = computeLifetimeStats(allRecords);
  const sinceJoin = computeLifetimeSinceJoin(dbUser!.createdAt, allRecords);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    const key = formatDateKey(day);
    return weekRecords.filter(
      (r) => formatDateKey(r.date) === key && r.completed && isFardRecord(r),
    ).length;
  });

  const weekFard = weekRecords.filter(isFardRecord);
  const todayFard = todayRecords.filter(isFardRecord);

  return jsonOk({
    weekCompleted: countCompleted(weekFard),
    weekTotal,
    weekDays,
    streak: computeStreak(allRecords),
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
  });
}
