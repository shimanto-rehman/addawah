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
  addDaysToKey,
  computeLifetimeSinceJoin,
  computeStreak,
  countCompleted,
  dateFromKey,
  dateKeyFromDbDate,
  formatDateKey,
  isFardRecord,
  rollingWeekStartKey,
  weekDayKeys,
  weekRangeFromStartKey,
} from './salah-utils';
import { PRAYERS, PRAYER_LABELS, type PrayerName } from './constants';
import { cappedLifetimeRecordStart, SALAH_RECORD_STATS_SELECT } from './salah-query';
import { fetchPrayerTimesFor, formatDateKeyInTimezone, prayerLocationFromUser } from './prayer-times';

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
  sunnahPrayed: number;
  sunnahTotal: number;
  totalCompleted: number;
  lifetimeJamat: number;
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
  stackedWeek: Array<{ label: string; onTime: number; kaza: number; missed: number; jamat: number }>;
  weekDays: number[];
  weekDeeds: (number | null)[];
  weekCalendarDeeds: (number | null)[];
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

export function invalidateAnalyticsCache(userId: string) {
  payloadCache.delete(userId);
}

async function buildAnalyticsPayloadInner(userId: string, includeCharts: boolean): Promise<AnalyticsPayload> {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true, city: true, country: true, latitude: true, longitude: true },
  });
  if (!dbUser) throw new Error('User not found');
  const location = prayerLocationFromUser(dbUser);
  if (!location) throw new Error('Location not set');
  const now = new Date();
  const prayerTimes = await fetchPrayerTimesFor(location, now);
  const todayKey = formatDateKeyInTimezone(now, prayerTimes.timeZone);
  const todayDate = dateFromKey(todayKey);
  const weekStartKey = rollingWeekStartKey(prayerTimes.timeZone, now);
  const { start: weekStart, end: weekEnd } = weekRangeFromStartKey(weekStartKey);
  const insightStart = dateFromKey(addDaysToKey(todayKey, -13));

  const recordStart = cappedLifetimeRecordStart(dbUser.createdAt, todayDate);

  const [lifetimeRecords, weekRecords, insightRecords, moods, challengeRows, calendarRows] = await Promise.all([
    prisma.salahRecord.findMany({
      where: { userId, date: { gte: recordStart, lte: todayDate } },
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
        date: { gte: insightStart, lte: todayDate },
      },
      select: { date: true, prayer: true, completed: true, updatedAt: true, completedOnTime: true, inJamat: true },
    }),
    includeCharts
      ? prisma.moodCheckIn.findMany({
          where: { userId, date: { gte: insightStart, lte: todayDate } },
          orderBy: { date: 'asc' },
        })
      : Promise.resolve([]),
    // Daily-challenge rows for the insight window (14d) — covers both the 7-day
    // week grid and the iman-mood series. Gated on includeCharts; only select
    // what both surfaces need: date + completed count.
    includeCharts
      ? prisma.dailyChallenge.findMany({
          where: { userId, date: { gte: insightStart, lte: todayDate } },
          select: { date: true, completed: true },
        })
      : Promise.resolve([]),
    // Calendar sunnah-action completions for the 14-day insight window.
    // Mask is a bitmap; we store it keyed by date and compute counts at
    // render time using the static events data.
    includeCharts
      ? prisma.calendarTaskCompletion.findMany({
          where: { userId, date: { gte: insightStart, lte: todayDate } },
          select: { date: true, mask: true },
        })
      : Promise.resolve([]),
  ]);

  // Daily-challenge completion keyed by UTC date string. Powers the deeds
  // overlay on the week chart and the per-day enrichment in the iman-mood
  // series. One 14-day query feeds both surfaces.
  const deedsByDate = new Map<string, number>(
    challengeRows.map((r) => [formatDateKey(r.date), r.completed]),
  );

  const sinceJoin = computeLifetimeSinceJoin(dbUser.createdAt, lifetimeRecords, prayerTimes, now);
  const streak = computeStreak(lifetimeRecords);

  // Count sunnah from existing lifetimeRecords (already fetched — no extra query)
  let sunnahPrayed = 0;
  let sunnahTotal = 0;
  for (const r of lifetimeRecords) {
    if (!isFardRecord(r)) {
      sunnahTotal += 1;
      if (r.completed) sunnahPrayed += 1;
    }
  }
  const insights = await computePrayerInsightsCached(userId, insightRecords, location, 14);

  const weekFard = weekRecords.filter(isFardRecord);
  const weekTotal = 7 * PRAYERS.length;
  const weekRate = weekTotal
    ? Math.round((countCompleted(weekFard) / weekTotal) * 100)
    : 0;

  const byPrayer = sinceJoin.byPrayer.map((p) => ({
    ...p,
    prayer: p.prayer as PrayerName,
    label: PRAYER_LABELS[p.prayer as PrayerName],
  }));

  const weekLabels = weekDayKeys(weekStartKey).map((key) =>
    dateFromKey(key).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
  );

  const stackedWeek = insights.days.slice(-7).map((d) => ({
    label: d.label.split(',')[0],
    onTime: d.onTime,
    kaza: d.kaza,
    missed: d.missed,
    jamat: d.jamat ?? 0,
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
    ? buildImanMoodSeries(insights.days, moods, formatDateKey, deedsByDate)
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

  const weekDays = weekDayKeys(weekStartKey).map((key) =>
    weekRecords.filter(
      (r) => dateKeyFromDbDate(r.date) === key && r.completed && isFardRecord(r),
    ).length,
  );

  // Daily-challenge deeds aligned to the same 7-day week grid as weekDays.
  // null = no challenge row that day (user didn't interact); 0 = row exists but
  // nothing completed. The deeds line renders only on days with a value.
  const weekDeeds = weekDayKeys(weekStartKey).map((key) => deedsByDate.get(key) ?? null);

  // Calendar sunnah completions aligned to the same 7-day week grid.
  // Uses popcount of the mask — raw completed count regardless of how many
  // actions were available that day. null = no calendar row that day.
  const calendarMaskByDate = new Map<string, number>(
    calendarRows.map((r) => [formatDateKey(r.date), r.mask]),
  );
  const weekCalendarDeeds = weekDayKeys(weekStartKey).map((key) => {
    const mask = calendarMaskByDate.get(key);
    if (mask === undefined) return null;
    return mask.toString(2).replace(/0/g, '').length;
  });

  const kpis: AnalyticsKpis = {
    iman: insights.currentIman,
    streak,
    weekRate,
    lifetimeRate: sinceJoin.lifetimeRate,
    perfectDays: sinceJoin.perfectDays,
    fajrMissed: sinceJoin.missedByPrayer.FAJR,
    sunnahPrayed,
    sunnahTotal,
    totalCompleted: sinceJoin.lifetimePrayed,
    lifetimeJamat: sinceJoin.lifetimeJamat,
  };

  return {
    kpis,
    insights,
    byPrayer,
    stackedWeek,
    weekDays,
    weekDeeds,
    weekCalendarDeeds,
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
