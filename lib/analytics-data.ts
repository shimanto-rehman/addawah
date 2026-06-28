import { prisma } from './prisma';
import {
  buildCoachingTips,
  summarizeBest,
  summarizeWeakest,
} from './analytics-coaching';
import { moodById } from './moods';
import { buildImanMoodSeries } from './iman-mood-analytics';
import type { CoachingTip } from './analytics-coaching';
import type { PrayerInsightsPayload } from './prayer-insights';
import { computePrayerInsightsCached } from './salah-day-stats';
import {
  addDays,
  computeLifetimeSinceJoin,
  computeLifetimeStats,
  computeStreak,
  countCompleted,
  formatDateKey,
  isFardRecord,
  startOfDay,
  startOfWeek,
} from './salah-utils';
import { PRAYERS, PRAYER_LABELS, type PrayerName } from './constants';
import { cappedLifetimeRecordStart, SALAH_RECORD_STATS_SELECT } from './salah-query';

const SALAH_ANALYTICS_SELECT = SALAH_RECORD_STATS_SELECT;

export const ANALYTICS_CACHE_HEADERS = {
  'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
};

export type AnalyticsKpis = {
  iman: number;
  streak: number;
  weekRate: number;
  lifetimeRate: number;
  perfectDays: number;
  fajrMissed: number;
  totalCompleted: number;
};

export type AnalyticsPayload = {
  kpis: AnalyticsKpis;
  insights: PrayerInsightsPayload;
  byPrayer: Array<{
    prayer: PrayerName;
    label: string;
    completed: number;
    total: number;
    rate: number;
  }>;
  stackedWeek: Array<{ label: string; onTime: number; kaza: number; missed: number }>;
  weekDays: number[];
  weekLabels: string[];
  moodHistory: Array<{
    date: string;
    moodId: string;
    label: string;
    iman: number | null;
  }>;
  imanMoodSeries: ReturnType<typeof buildImanMoodSeries>['series'];
  imanMoodCorrelation: number | null;
  coaching: CoachingTip[];
  totals: PrayerInsightsPayload['totals'];
  trend: PrayerInsightsPayload['trend'];
  revision: string;
};

export type AnalyticsSummaryPayload = {
  kpis: AnalyticsKpis;
  coaching: CoachingTip[];
  totals: PrayerInsightsPayload['totals'];
  trend: PrayerInsightsPayload['trend'];
  revision: string;
};

const payloadCache = new Map<string, { at: number; payload: AnalyticsPayload; complete: boolean }>();
const PAYLOAD_CACHE_MS = 60_000;

async function buildAnalyticsPayloadInner(userId: string, includeCharts: boolean): Promise<AnalyticsPayload> {
  const today = startOfDay(new Date());
  const weekStart = startOfWeek(today);
  const weekEnd = addDays(weekStart, 6);
  const insightStart = addDays(today, -13);
  const moodStart = addDays(today, -13);

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true, city: true, country: true },
  });
  if (!dbUser) throw new Error('User not found');

  const recordStart = cappedLifetimeRecordStart(dbUser.createdAt, today);

  const [lifetimeRecords, weekRecords, insightRecords, moods] = await Promise.all([
    prisma.salahRecord.findMany({
      where: { userId, date: { gte: recordStart, lte: today } },
      select: SALAH_ANALYTICS_SELECT,
      orderBy: { date: 'asc' },
    }),
    prisma.salahRecord.findMany({
      where: { userId, date: { gte: weekStart, lte: weekEnd } },
      select: SALAH_ANALYTICS_SELECT,
    }),
    prisma.salahRecord.findMany({
      where: {
        userId,
        kind: 'FARD',
        date: { gte: insightStart, lte: today },
      },
      select: { date: true, prayer: true, completed: true, updatedAt: true },
    }),
    includeCharts
      ? prisma.moodCheckIn.findMany({
          where: { userId, date: { gte: moodStart, lte: today } },
          orderBy: { date: 'asc' },
        })
      : Promise.resolve([]),
  ]);

  const city = dbUser.city?.trim() || 'Dhaka';
  const country = dbUser.country?.trim() || 'Bangladesh';

  const lifetime = computeLifetimeStats(lifetimeRecords);
  const sinceJoin = computeLifetimeSinceJoin(dbUser.createdAt, lifetimeRecords);
  const streak = computeStreak(lifetimeRecords);
  const insights = await computePrayerInsightsCached(userId, insightRecords, city, country, 14);

  const weekFard = weekRecords.filter(isFardRecord);
  const weekTotal = 7 * PRAYERS.length;
  const weekRate = weekTotal
    ? Math.round((countCompleted(weekFard) / weekTotal) * 100)
    : 0;

  const byPrayer = lifetime.byPrayer.map((p) => ({
    ...p,
    prayer: p.prayer as PrayerName,
    label: PRAYER_LABELS[p.prayer as PrayerName],
  }));

  const weekLabels = Array.from({ length: 7 }, (_, i) =>
    addDays(weekStart, i).toLocaleDateString('en-US', { weekday: 'short' }),
  );

  const stackedWeek = insights.days.slice(-7).map((d) => ({
    label: d.label.split(',')[0],
    onTime: d.onTime,
    kaza: d.kaza,
    missed: d.missed,
  }));

  const moodHistory = includeCharts
    ? moods.map((m) => {
        const mood = moodById(m.moodId);
        const day = insights.days.find((d) => d.date === formatDateKey(m.date));
        return {
          date: formatDateKey(m.date),
          moodId: m.moodId,
          label: mood?.label ?? m.moodId,
          iman: day?.iman ?? null,
        };
      })
    : [];

  const imanMood = includeCharts
    ? buildImanMoodSeries(insights.days, moods, formatDateKey)
    : { series: [], correlation: null };

  const weakestPrayer = summarizeWeakest(byPrayer);
  const bestPrayer = summarizeBest(byPrayer);

  const coaching = buildCoachingTips({
    insights,
    streak,
    fajrMissed: sinceJoin.missedByPrayer.FAJR,
    weekRate,
    bestPrayer,
    weakestPrayer,
    perfectDays: sinceJoin.perfectDays,
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    const key = formatDateKey(day);
    return weekRecords.filter(
      (r) => formatDateKey(r.date) === key && r.completed && isFardRecord(r),
    ).length;
  });

  const kpis: AnalyticsKpis = {
    iman: insights.currentIman,
    streak,
    weekRate,
    lifetimeRate: sinceJoin.lifetimeRate,
    perfectDays: sinceJoin.perfectDays,
    fajrMissed: sinceJoin.missedByPrayer.FAJR,
    totalCompleted: lifetime.completed,
  };

  return {
    kpis,
    insights,
    byPrayer,
    stackedWeek,
    weekDays,
    weekLabels,
    moodHistory,
    imanMoodSeries: imanMood.series,
    imanMoodCorrelation: imanMood.correlation,
    coaching,
    totals: insights.totals,
    trend: insights.trend,
    revision: String(Date.now()),
  };
}

export async function buildAnalyticsPayload(userId: string): Promise<AnalyticsPayload> {
  const cached = payloadCache.get(userId);
  const now = Date.now();
  if (cached?.complete && now - cached.at < PAYLOAD_CACHE_MS) return cached.payload;

  const payload = await buildAnalyticsPayloadInner(userId, true);
  payloadCache.set(userId, { at: now, payload, complete: true });
  return payload;
}

export async function buildAnalyticsSummaryFast(userId: string): Promise<AnalyticsSummaryPayload> {
  const cached = payloadCache.get(userId);
  const now = Date.now();
  if (cached && now - cached.at < PAYLOAD_CACHE_MS) {
    return analyticsSummaryFromPayload(cached.payload);
  }

  const payload = await buildAnalyticsPayloadInner(userId, false);
  payloadCache.set(userId, {
    at: now,
    payload: {
      ...payload,
      moodHistory: [],
      imanMoodSeries: [],
      imanMoodCorrelation: null,
    },
    complete: false,
  });
  return analyticsSummaryFromPayload(payload);
}

export function analyticsSummaryFromPayload(payload: AnalyticsPayload): AnalyticsSummaryPayload {
  return {
    kpis: payload.kpis,
    coaching: payload.coaching,
    totals: payload.totals,
    trend: payload.trend,
    revision: payload.revision,
  };
}
