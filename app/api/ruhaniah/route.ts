import { apiRequireAuth, jsonOk, jsonError } from '@/lib/api-helpers';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { startOfDay, addDays } from '@/lib/salah-utils';
import { ruhaniahSubmissionSchema } from '@/lib/ruhaniah-validation';
import { getOrComputeVerse, type VerseResult } from '@/lib/ruhaniah-verse';
import { getRuhaniahToday } from '@/lib/ruhaniah-data';
import { computeFahmProfile } from '@/lib/ruhaniah-profile';
import { analyzeWeaknesses, type Weakness } from '@/lib/ruhaniah-weakness';
import { getChallengeFahmSignal } from '@/lib/challenge-data';
import { clearRuhaniahReminderForDate } from '@/lib/notifications';
import { fetchPrayerTimesFor, formatDateKeyInTimezone, prayerLocationFromUser } from '@/lib/prayer-times';
import { kvGetJson, kvSetJson, kvDel } from '@/lib/kv';

/** Redis cache helpers */
function todayCacheKey(userId: string) {
  const dateStr = startOfDay(new Date()).toISOString().slice(0, 10);
  return `ruhaniah:today:${userId}:${dateStr}`;
}
function insightsCacheKey(userId: string) {
  return `ruhaniah:insights:${userId}`;
}
const INSIGHTS_TTL = 600; // 10 minutes
const TODAY_TTL = 14400; // 4 hours (invalidated on POST anyway)

/** Optimized: fetch all insight data in parallel with bounded queries */
async function getInsightsData(userId: string) {
  const cutoff = addDays(startOfDay(new Date()), -30);

  const [taqwaHistory, barakahHistory, duaGrouped, duaEntries] = await Promise.all([
    prisma.taqwaPulse.findMany({
      where: { userId, date: { gte: cutoff } },
      orderBy: { date: 'desc' },
      select: { date: true, score: true },
      take: 30,
    }),
    prisma.barakahLog.findMany({
      where: { userId, date: { gte: cutoff } },
      orderBy: { date: 'desc' },
      select: { date: true, timeScore: true, rizqScore: true, healthScore: true, heartScore: true },
      take: 30,
    }),
    prisma.duaEntry.groupBy({
      by: ['status'],
      where: { userId },
      _count: { _all: true },
    }),
    // All duas with dates for timeline chart
    prisma.duaEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        text: true,
        category: true,
        status: true,
        dateStarted: true,
        dateResolved: true,
        createdAt: true,
      },
      take: 50,
    }),
  ]);

  // Parse dua stats from groupBy result
  let total = 0;
  let answered = 0;
  let waiting = 0;
  let stored = 0;
  for (const row of duaGrouped) {
    total += row._count._all;
    if (row.status === 'ANSWERED_SAME' || row.status === 'ANSWERED_DIFFERENT') answered += row._count._all;
    if (row.status === 'WAITING') waiting += row._count._all;
    if (row.status === 'STORED_AKHIRAH') stored += row._count._all;
  }

  // Compute dua acceptance durations (days between dateStarted and dateResolved)
  const duaTimeline = duaEntries
    .filter((d) => d.dateResolved)
    .map((d) => ({
      text: d.text,
      category: d.category,
      status: d.status,
      daysToAccept: Math.max(1, Math.round((d.dateResolved!.getTime() - d.dateStarted.getTime()) / 86400000)),
      dateStarted: d.dateStarted.toISOString(),
      dateResolved: d.dateResolved!.toISOString(),
    }));

  // All duas for the list view
  const duaList = duaEntries.map((d) => ({
    id: d.id,
    text: d.text,
    category: d.category,
    status: d.status,
    dateStarted: d.dateStarted.toISOString(),
    dateResolved: d.dateResolved?.toISOString() ?? null,
    daysWaiting: d.status === 'WAITING'
      ? Math.max(1, Math.round((Date.now() - d.dateStarted.getTime()) / 86400000))
      : null,
  }));

  return {
    taqwaHistory: taqwaHistory.map((t) => ({ date: t.date.toISOString(), score: t.score })),
    barakahHistory: barakahHistory.map((b) => ({
      date: b.date.toISOString(),
      timeScore: b.timeScore,
      rizqScore: b.rizqScore,
      healthScore: b.healthScore,
      heartScore: b.heartScore,
    })),
    duaStats: { total, answered, waiting, stored },
    duaTimeline,
    duaList,
  };
}

/** GET — Check if today's flow is done + return verse + insights (Redis-cached) */
export async function GET() {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const userId = user!.id;

  // Check Redis cache for today's data
  const cached = await kvGetJson<Record<string, unknown>>(todayCacheKey(userId));
  if (cached) {
    return jsonOk(cached);
  }

  // Cache miss — fetch from DB
  const [today, fahmProfile, insightsData] = await Promise.all([
    getRuhaniahToday(userId),
    prisma.userFahmProfile.findUnique({
      where: { userId },
      select: {
        totalQuestions: true,
        categoryScores: true,
        overallQAS: true,
        strongest: true,
        weakest: true,
        trend: true,
      },
    }),
    getInsightsData(userId),
  ]);

  // Always include verse (already fetched in getRuhaniahToday if it exists)
  const verse = today.verse;
  const signals = (verse?.signals ?? {}) as Record<string, unknown>;

  // Compute weaknesses from signals already gathered (no extra DB queries)
  const weaknesses: Weakness[] = today.completed
    ? analyzeWeaknesses(
        {
          todaySalah: signals.todaySalah as number | undefined,
          taqwaScore: (signals.taqwaScore as number | undefined) ?? today.taqwaScore ?? undefined,
          fahmWeakest: (signals.fahmWeakest as string | undefined) ?? fahmProfile?.weakest ?? undefined,
          barakah: (signals.barakah as any) ?? today.barakahScores ?? undefined,
          activeDuas: signals.activeDuas as number | undefined,
          recentlyAnswered: signals.recentlyAnswered as number | undefined,
          mood: signals.mood as string | undefined,
          streak: signals.streak as number | undefined,
        },
        fahmProfile
          ? {
              categoryScores: fahmProfile.categoryScores as Record<string, number>,
              overallQAS: fahmProfile.overallQAS,
              weakest: fahmProfile.weakest,
              trend: fahmProfile.trend,
            }
          : null,
        insightsData.duaStats,
      )
    : [];

  const payload = {
    completed: today.completed,
    taqwaScore: today.taqwaScore,
    barakahScores: today.barakahScores,
    verse: verse
      ? {
          ayahRef: verse.ayahRef,
          arabic: (signals.arabic as string) ?? '',
          translation: (signals.translation as string) ?? '',
          tafsir: (signals.tafsir as string) ?? '',
          reflectionText: verse.reflectionText,
          dawahText: verse.dawahText,
          signals: verse.signals,
        }
      : null,
    fahmProfile: fahmProfile
      ? {
          totalQuestions: fahmProfile.totalQuestions,
          categoryScores: fahmProfile.categoryScores as Record<string, number>,
          overallQAS: fahmProfile.overallQAS,
          strongest: fahmProfile.strongest,
          weakest: fahmProfile.weakest,
          trend: fahmProfile.trend,
        }
      : null,
    insights: insightsData,
    weaknesses,
  };

  // Cache for 4h (invalidated on POST anyway)
  kvSetJson(todayCacheKey(userId), payload, TODAY_TTL).catch(() => {});

  return jsonOk(payload);
}

/** POST — Submit the entire nightly flow (all 4 steps) */
export async function POST(req: Request) {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const parsed = ruhaniahSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      `Validation failed: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
      400,
    );
  }

  const { taqwaScore, fahmResponses, barakahScores, duaEntries } = parsed.data;
  const userId = user!.id;
  const today = startOfDay(new Date());

  try {
    // Single transaction for all writes
    const transactionOps = [
      // 1. Taqwa pulse
      prisma.taqwaPulse.upsert({
        where: { userId_date: { userId, date: today } },
        create: { userId, date: today, score: taqwaScore },
        update: { score: taqwaScore },
      }),

      // 2. Fahm responses (up to 3)
      ...fahmResponses.map((r) =>
        prisma.fahmResponse.upsert({
          where: {
            userId_date_questionId: {
              userId,
              date: today,
              questionId: r.questionId,
            },
          },
          create: {
            userId,
            date: today,
            questionId: r.questionId,
            answerIndex: r.answerIndex,
            weight: r.weight,
          },
          update: { answerIndex: r.answerIndex, weight: r.weight },
        }),
      ),

      // 3. Barakah log
      prisma.barakahLog.upsert({
        where: { userId_date: { userId, date: today } },
        create: { userId, date: today, ...barakahScores },
        update: barakahScores,
      }),

      // 4. New dua entries
      ...duaEntries.map((d) =>
        prisma.duaEntry.create({
          data: {
            userId,
            text: d.text,
            category: d.category,
            context: d.context,
            dateStarted: today,
          },
        }),
      ),
    ];

    await prisma.$transaction(transactionOps);
  } catch (txErr) {
    logger.error({ route: '/api/ruhaniah', err: txErr }, 'Transaction failed');
    return jsonError('Transaction failed', 500);
  }

  // Invalidate Redis cache (fire-and-forget)
  kvDel(todayCacheKey(userId)).catch(() => {});
  kvDel(insightsCacheKey(userId)).catch(() => {});

  // Fire-and-forget: clear end-of-day reminder notification (non-blocking)
  prisma.user
    .findUnique({
      where: { id: userId },
      select: { city: true, country: true, latitude: true, longitude: true },
    })
    .then((u) => (u ? prayerLocationFromUser(u) : null))
    .then((loc) => (loc ? fetchPrayerTimesFor(loc, today) : null))
    .then((times) =>
      times ? clearRuhaniahReminderForDate(userId, formatDateKeyInTimezone(today, times.timeZone)) : undefined,
    )
    .catch(() => {});

  // Fetch the challenge signal once and reuse it for both the Fahm profile
  // recompute (fire-and-forget) and the weakness analysis below — avoids a
  // redundant 14-day DailyChallenge query per POST.
  const challengeSignal = await getChallengeFahmSignal(userId);

  // Fire-and-forget: recompute Fahm profile (non-blocking), reusing the signal.
  computeFahmProfile(userId, challengeSignal).catch((err) => logger.error({ route: '/api/ruhaniah', err }, 'Fahm profile recompute failed'));

  // Compute verse + insights (these read from DB, not write)
  let verse: VerseResult | null = null;
  let insightsPayload: Record<string, unknown> | null = null;
  let weaknesses: Weakness[] = [];

  try {
    const [verseResult, historyData] = await Promise.all([
      getOrComputeVerse(userId, today),
      getInsightsData(userId),
    ]);

    verse = verseResult;

    // Fetch fahmProfile after computeFahmProfile has had time to upsert
    const fahmProfile = await prisma.userFahmProfile.findUnique({
      where: { userId },
      select: {
        totalQuestions: true,
        categoryScores: true,
        overallQAS: true,
        strongest: true,
        weakest: true,
        trend: true,
      },
    });

    insightsPayload = {
      fahmProfile: fahmProfile
        ? {
            totalQuestions: fahmProfile.totalQuestions,
            categoryScores: fahmProfile.categoryScores as Record<string, number>,
            overallQAS: fahmProfile.overallQAS,
            strongest: fahmProfile.strongest,
            weakest: fahmProfile.weakest,
            trend: fahmProfile.trend,
          }
        : null,
      ...historyData,
    };

    // Compute weaknesses from verse signals (no extra DB queries)
    const vSignals = (verseResult?.signals ?? {}) as Record<string, unknown>;
    weaknesses = analyzeWeaknesses(
      {
        todaySalah: vSignals.todaySalah as number | undefined,
        todayJamat: vSignals.todayJamat as number | undefined,
        gender: user!.gender,
        taqwaScore: (vSignals.taqwaScore as number | undefined) ?? taqwaScore,
        fahmWeakest: vSignals.fahmWeakest as string | undefined,
        barakah:
          (vSignals.barakah as
            | { timeScore: number; rizqScore: number; healthScore: number; heartScore: number }
            | undefined) ?? barakahScores,
        activeDuas: vSignals.activeDuas as number | undefined,
        streak: vSignals.streak as number | undefined,
        challengeConsistency: challengeSignal.consistency,
      },
      insightsPayload?.fahmProfile as { categoryScores: Record<string, number>; overallQAS: number; weakest?: string | null; trend: string } | null | undefined ?? null,
      historyData.duaStats,
    );
  } catch (verseErr) {
    logger.error({ route: '/api/ruhaniah', err: verseErr }, 'Verse/insights computation failed');
    // Data was saved — verse/insights will be available on next page load
  }

  return jsonOk({
    saved: true,
    verse: verse
      ? {
          ayahRef: verse.ayahRef,
          arabic: verse.arabic,
          translation: verse.translation,
          tafsir: verse.tafsir,
          reflectionText: verse.reflectionText,
          dawahText: verse.dawahText,
        }
      : null,
    insights: insightsPayload,
    weaknesses,
  });
}
