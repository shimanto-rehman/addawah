import { prisma } from '@/lib/prisma';
import { apiRequireAuth, jsonOk } from '@/lib/api-helpers';
import {
  computeLifetimeStats,
  computeStreak,
  countCompleted,
  formatDateKey,
  startOfWeek,
  addDays,
} from '@/lib/salah-utils';
import { PRAYERS } from '@/lib/constants';

export async function GET() {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const weekStart = startOfWeek(new Date());
  const weekEnd = addDays(weekStart, 6);
  const todayKey = formatDateKey(new Date());

  const [weekRecords, allRecords, todayRecords] = await Promise.all([
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
  ]);

  const weekTotal = 7 * PRAYERS.length;
  const lifetime = computeLifetimeStats(allRecords);

  return jsonOk({
    weekCompleted: countCompleted(weekRecords),
    weekTotal,
    streak: computeStreak(allRecords),
    lifetimeRate: lifetime.rate,
    todayCompleted: countCompleted(todayRecords),
  });
}
