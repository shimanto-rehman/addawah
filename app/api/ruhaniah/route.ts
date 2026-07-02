import { apiRequireAuth, jsonOk, jsonError } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';
import { startOfDay, addDays } from '@/lib/salah-utils';
import { ruhaniahSubmissionSchema } from '@/lib/ruhaniah-validation';
import { getOrComputeVerse } from '@/lib/ruhaniah-verse';
import { getRuhaniahToday } from '@/lib/ruhaniah-data';
import { computeFahmProfile } from '@/lib/ruhaniah-profile';
import { clearRuhaniahReminderForDate } from '@/lib/notifications';
import { fetchPrayerTimes, formatDateKeyInTimezone } from '@/lib/prayer-times';

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

/** GET — Check if today's flow is done + return verse + insights */
export async function GET() {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const userId = user!.id;
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

  // If completed, also fetch verse
  let verse = today.verse;
  if (today.completed && !verse) {
    verse = await prisma.ruhaniahVerse.findUnique({
      where: { userId_date: { userId, date: startOfDay(new Date()) } },
    });
  }

  const signals = (verse?.signals ?? {}) as Record<string, unknown>;

  return jsonOk({
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
  });
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
    console.error('[ruhaniah] Transaction failed:', txErr);
    return jsonError(`Transaction failed: ${txErr instanceof Error ? txErr.message : 'unknown'}`, 500);
  }

  // Fire-and-forget: clear end-of-day reminder notification (non-blocking)
  prisma.user
    .findUnique({ where: { id: userId }, select: { city: true, country: true } })
    .then((u) =>
      fetchPrayerTimes(u?.city?.trim() || 'Dhaka', u?.country?.trim() || 'Bangladesh', today),
    )
    .then((times) => clearRuhaniahReminderForDate(userId, formatDateKeyInTimezone(today, times.timeZone)))
    .catch(() => {});

  // Fire-and-forget: recompute Fahm profile (non-blocking)
  computeFahmProfile(userId).catch(console.error);

  // Compute verse + insights (these read from DB, not write)
  // Use a timeout to avoid hanging the response
  let verse: Awaited<ReturnType<typeof getOrComputeVerse>> | null = null;
  let insightsPayload: Record<string, unknown> | null = null;

  try {
    const [verseResult, fahmProfile, historyData] = await Promise.all([
      getOrComputeVerse(userId, today),
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

    verse = verseResult;
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
  } catch (verseErr) {
    console.error('[ruhaniah] Verse/insights computation failed:', verseErr);
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
  });
}
