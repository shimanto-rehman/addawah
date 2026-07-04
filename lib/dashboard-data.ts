import { prisma } from './prisma';
import { moodById } from './moods';
import { buildStatsPayload, type StatsPayload } from './stats-data';
import { fetchPrayerTimes, formatDateKeyInTimezone } from './prayer-times';
import {
  buildSalahGrid,
  formatDateKey,
  rollingWeekStartKey,
  startOfDay,
  weekRangeFromStartKey,
  type SalahGrid,
} from './salah-utils';

export type DashboardPayload = {
  stats: StatsPayload;
  mood: {
    today: { moodId: string; label: string | undefined; date: string } | null;
  };
  grid: SalahGrid;
  weekKey: string;
};

async function fetchTodayMood(userId: string) {
  const today = startOfDay(new Date());
  const checkIn = await prisma.moodCheckIn.findUnique({
    where: { userId_date: { userId, date: today } },
    select: { moodId: true },
  });
  if (!checkIn) return null;
  const mood = moodById(checkIn.moodId);
  return {
    moodId: checkIn.moodId,
    label: mood?.label,
    date: formatDateKey(today),
  };
}

async function fetchSalahGrid(userId: string, weekStartKey: string): Promise<SalahGrid> {
  const { start: weekStart, end: weekEnd } = weekRangeFromStartKey(weekStartKey);
  const records = await prisma.salahRecord.findMany({
    where: {
      userId,
      date: { gte: weekStart, lte: weekEnd },
    },
    select: {
      date: true,
      prayer: true,
      kind: true,
      unit: true,
      completed: true,
    },
  });
  return buildSalahGrid(records);
}

export async function buildDashboardPayload(userId: string): Promise<DashboardPayload> {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true, city: true, country: true },
  });
  if (!dbUser) throw new Error('User not found');
  const city = dbUser.city?.trim() || 'Dhaka';
  const country = dbUser.country?.trim() || 'Bangladesh';
  const times = await fetchPrayerTimes(city, country, new Date());
  const weekKey = rollingWeekStartKey(times.timeZone);

  const [stats, todayMood, grid] = await Promise.all([
    buildStatsPayload(userId, { userInfo: dbUser }),
    fetchTodayMood(userId),
    fetchSalahGrid(userId, weekKey),
  ]);

  return {
    stats,
    mood: { today: todayMood },
    grid,
    weekKey,
  };
}
