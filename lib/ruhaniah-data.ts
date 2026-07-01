import { prisma } from './prisma';
import { startOfDay } from './salah-utils';

/** Check if user has completed today's Ruhaniah flow */
export async function getRuhaniahToday(userId: string) {
  const today = startOfDay(new Date());

  const [taqwa, barakah, verse] = await Promise.all([
    prisma.taqwaPulse.findUnique({
      where: { userId_date: { userId, date: today } },
      select: { score: true },
    }),
    prisma.barakahLog.findUnique({
      where: { userId_date: { userId, date: today } },
      select: { timeScore: true, rizqScore: true, healthScore: true, heartScore: true },
    }),
    prisma.ruhaniahVerse.findUnique({
      where: { userId_date: { userId, date: today } },
    }),
  ]);

  const completed = !!(taqwa && barakah);

  return {
    completed,
    taqwaScore: taqwa?.score ?? null,
    barakahScores: barakah ?? null,
    verse: verse ?? null,
  };
}

/** Get last N days of taqwa + barakah history */
export async function getRuhaniahHistory(userId: string, days = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);

  const [taqwaHistory, barakahHistory, duaStats] = await Promise.all([
    prisma.taqwaPulse.findMany({
      where: { userId, date: { gte: cutoff } },
      orderBy: { date: 'desc' },
      select: { date: true, score: true },
    }),
    prisma.barakahLog.findMany({
      where: { userId, date: { gte: cutoff } },
      orderBy: { date: 'desc' },
      select: {
        date: true,
        timeScore: true,
        rizqScore: true,
        healthScore: true,
        heartScore: true,
      },
    }),
    getDuaStats(userId),
  ]);

  return { taqwaHistory, barakahHistory, duaStats };
}

/** Get active duas for the nightly flow (lightweight) */
export async function getActiveDuas(userId: string) {
  const duas = await prisma.duaEntry.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 15,
    select: {
      id: true,
      text: true,
      category: true,
      status: true,
      dateStarted: true,
    },
  });

  return duas;
}

/** Get dua stats for insights */
export async function getDuaStats(userId: string) {
  const [total, answered, waiting] = await Promise.all([
    prisma.duaEntry.count({ where: { userId } }),
    prisma.duaEntry.count({
      where: { userId, status: { in: ['ANSWERED_SAME', 'ANSWERED_DIFFERENT'] } },
    }),
    prisma.duaEntry.count({ where: { userId, status: 'WAITING' } }),
  ]);

  return { total, answered, waiting };
}
