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

/** Get dua stats for insights — single groupBy query instead of 3 COUNTs */
export async function getDuaStats(userId: string) {
  const grouped = await prisma.duaEntry.groupBy({
    by: ['status'],
    where: { userId },
    _count: { _all: true },
  });

  let total = 0;
  let answered = 0;
  let waiting = 0;
  for (const row of grouped) {
    total += row._count._all;
    if (row.status === 'ANSWERED_SAME' || row.status === 'ANSWERED_DIFFERENT') answered += row._count._all;
    if (row.status === 'WAITING') waiting += row._count._all;
  }

  return { total, answered, waiting };
}
