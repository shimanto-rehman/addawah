import { prisma } from './prisma';
import { moodById } from './moods';
import { buildStatsPayload, type StatsPayload } from './stats-data';
import { fetchPrayerTimesFor, formatDateKeyInTimezone, prayerLocationFromUser } from './prayer-times';
import { getDailyChallenge, type DailyChallengeState } from './challenge-data';
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
  challenge: DailyChallengeState;
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
      inJamat: true,
    },
  });
  return buildSalahGrid(records);
}

export async function buildDashboardPayload(userId: string): Promise<DashboardPayload> {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true, city: true, country: true, latitude: true, longitude: true },
  });
  if (!dbUser) throw new Error('User not found');
  const location = prayerLocationFromUser(dbUser);
  if (!location) throw new Error('Location not set');
  const times = await fetchPrayerTimesFor(location, new Date());
  const weekKey = rollingWeekStartKey(times.timeZone);
  const [stats, todayMood, grid, challenge] = await Promise.all([
    buildStatsPayload(userId, { userInfo: dbUser }),
    fetchTodayMood(userId),
    fetchSalahGrid(userId, weekKey),
    getDailyChallenge(userId),
  ]);

  return {
    stats,
    mood: { today: todayMood },
    grid,
    weekKey,
    challenge,
  };
}
