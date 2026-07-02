import { prisma } from './prisma';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { kvGetJson, kvSetJson } from './kv';

const CATEGORIES = [
  'QADR',
  'TRUTH',
  'DAWAH',
  'NAFS',
  'AKHIRAH',
  'SABR_SHUKR',
  'ILM',
  'SOCIAL',
] as const;

type FahmQuestionEntry = { id: string; category: string };

const FAHM_CACHE_KEY = 'ruhaniah:fahm-questions';
const FAHM_CACHE_TTL = 86400; // 24h — static data

async function getQuestionCategoryMap(): Promise<Map<string, string>> {
  // Try Redis first (survives cold starts)
  const cached = await kvGetJson<Record<string, string>>(FAHM_CACHE_KEY);
  if (cached) return new Map(Object.entries(cached));

  try {
    const filePath = join(process.cwd(), 'public', 'data', 'fahm-questions.json');
    const raw = await readFile(filePath, 'utf-8');
    const questions = JSON.parse(raw) as FahmQuestionEntry[];
    const map = new Map(questions.map((q) => [q.id, q.category]));
    // Fire-and-forget Redis set (store as object for JSON serialization)
    kvSetJson(FAHM_CACHE_KEY, Object.fromEntries(map), FAHM_CACHE_TTL).catch(() => {});
    return map;
  } catch {
    return new Map();
  }
}

export type FahmProfile = {
  totalQuestions: number;
  categoryScores: Record<string, number>;
  overallQAS: number;
  strongest: string | null;
  weakest: string | null;
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING' | 'NEW';
};

/** Compute Fahm profile from raw responses — called async after submission */
export async function computeFahmProfile(userId: string): Promise<FahmProfile> {
  const [recent, categoryMap] = await Promise.all([
    prisma.fahmResponse.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 90, // last 30 days × 3 questions
      select: { questionId: true, weight: true, createdAt: true },
    }),
    getQuestionCategoryMap(),
  ]);

  if (recent.length === 0) {
    return {
      totalQuestions: 0,
      categoryScores: {},
      overallQAS: 0,
      strongest: null,
      weakest: null,
      trend: 'NEW',
    };
  }

  // Group by category and compute averages
  const categoryTotals: Record<string, { sum: number; count: number }> = {};
  for (const cat of CATEGORIES) {
    categoryTotals[cat] = { sum: 0, count: 0 };
  }

  for (const response of recent) {
    const cat = categoryMap.get(response.questionId);
    if (cat && categoryTotals[cat]) {
      categoryTotals[cat].sum += response.weight;
      categoryTotals[cat].count += 1;
    }
  }

  const categoryScores: Record<string, number> = {};
  for (const cat of CATEGORIES) {
    const { sum, count } = categoryTotals[cat];
    categoryScores[cat] = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
  }

  // Overall QAS
  const activeCategories = Object.values(categoryScores).filter((s) => s > 0);
  const overallQAS =
    activeCategories.length > 0
      ? Math.round(
          (activeCategories.reduce((a, b) => a + b, 0) / activeCategories.length) * 10,
        ) / 10
      : 0;

  // Strongest and weakest
  const sorted = Object.entries(categoryScores)
    .filter(([, score]) => score > 0)
    .sort(([, a], [, b]) => b - a);

  const strongest = sorted.length > 0 ? sorted[0][0] : null;
  const weakest = sorted.length > 0 ? sorted[sorted.length - 1][0] : null;

  // Trend: compare first half vs second half of responses
  const half = Math.floor(recent.length / 2);
  const older = recent.slice(half);
  const newer = recent.slice(0, half);

  const olderAvg =
    older.length > 0 ? older.reduce((sum, r) => sum + r.weight, 0) / older.length : 0;
  const newerAvg =
    newer.length > 0 ? newer.reduce((sum, r) => sum + r.weight, 0) / newer.length : 0;

  let trend: FahmProfile['trend'] = 'NEW';
  if (recent.length >= 6) {
    const diff = newerAvg - olderAvg;
    if (diff > 0.3) trend = 'IMPROVING';
    else if (diff < -0.3) trend = 'DECLINING';
    else trend = 'STABLE';
  }

  // Upsert the profile
  await prisma.userFahmProfile.upsert({
    where: { userId },
    create: {
      userId,
      totalQuestions: recent.length,
      categoryScores,
      overallQAS,
      strongest,
      weakest,
      trend,
    },
    update: {
      totalQuestions: recent.length,
      categoryScores,
      overallQAS,
      strongest,
      weakest,
      trend,
    },
  });

  return { totalQuestions: recent.length, categoryScores, overallQAS, strongest, weakest, trend };
}
