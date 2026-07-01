import { apiRequireAuth, jsonOk, jsonError } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';
import { startOfDay } from '@/lib/salah-utils';
import { ruhaniahSubmissionSchema } from '@/lib/ruhaniah-validation';
import { getOrComputeVerse } from '@/lib/ruhaniah-verse';
import { getRuhaniahToday } from '@/lib/ruhaniah-data';
import { computeFahmProfile } from '@/lib/ruhaniah-profile';

/** GET — Check if today's flow is done + return verse if available */
export async function GET() {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const userId = user!.id;
  const [today, fahmProfile] = await Promise.all([
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

  // Fire-and-forget Fahm profile recompute
  computeFahmProfile(userId).catch(console.error);

  // Return verse (precomputed or compute on-demand)
  const verse = await getOrComputeVerse(userId, today);

  return jsonOk({
    saved: true,
    verse: {
      ayahRef: verse.ayahRef,
      arabic: verse.arabic,
      translation: verse.translation,
      tafsir: verse.tafsir,
      reflectionText: verse.reflectionText,
      dawahText: verse.dawahText,
    },
  });
}
