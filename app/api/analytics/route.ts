import { prisma } from '@/lib/prisma';
import { apiRequireAuth, jsonOk } from '@/lib/api-helpers';
import {
  buildCoachingTips,
  summarizeBest,
  summarizeWeakest,
} from '@/lib/analytics-coaching';
import { moodById } from '@/lib/moods';
import { buildImanMoodSeries } from '@/lib/iman-mood-analytics';
import { computePrayerInsights } from '@/lib/prayer-insights';
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
} from '@/lib/salah-utils';
import { PRAYERS, PRAYER_LABELS, type PrayerName } from '@/lib/constants';

export async function GET() {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const today = startOfDay(new Date());
  const weekStart = startOfWeek(today);
  const weekEnd = addDays(weekStart, 6);
  const insightStart = addDays(today, -13);
  const moodStart = addDays(today, -13);

  const [allRecords, weekRecords, insightRecords, moods, dbUser] = await Promise.all([
    prisma.salahRecord.findMany({ where: { userId: user!.id }, orderBy: { date: 'asc' } }),
    prisma.salahRecord.findMany({
      where: { userId: user!.id, date: { gte: weekStart, lte: weekEnd } },
    }),
    prisma.salahRecord.findMany({
      where: {
        userId: user!.id,
        kind: 'FARD',
        date: { gte: insightStart, lte: today },
      },
      select: { date: true, prayer: true, completed: true, updatedAt: true },
    }),
    prisma.moodCheckIn.findMany({
      where: { userId: user!.id, date: { gte: moodStart, lte: today } },
      orderBy: { date: 'asc' },
    }),
    prisma.user.findUnique({
      where: { id: user!.id },
      select: { createdAt: true, city: true, country: true },
    }),
  ]);

  const city = dbUser?.city?.trim() || user!.city?.trim() || 'Dhaka';
  const country = dbUser?.country?.trim() || user!.country?.trim() || 'Bangladesh';

  const lifetime = computeLifetimeStats(allRecords);
  const sinceJoin = computeLifetimeSinceJoin(dbUser!.createdAt, allRecords);
  const streak = computeStreak(allRecords);
  const insights = await computePrayerInsights(insightRecords, city, country, 14);

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

  const moodHistory = moods.map((m) => {
    const mood = moodById(m.moodId);
    const day = insights.days.find((d) => d.date === formatDateKey(m.date));
    return {
      date: formatDateKey(m.date),
      moodId: m.moodId,
      label: mood?.label ?? m.moodId,
      iman: day?.iman ?? null,
    };
  });

  const { series: imanMoodSeries, correlation: imanMoodCorrelation } = buildImanMoodSeries(
    insights.days,
    moods,
    formatDateKey,
  );

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

  return jsonOk({
    kpis: {
      iman: insights.currentIman,
      streak,
      weekRate,
      lifetimeRate: sinceJoin.lifetimeRate,
      perfectDays: sinceJoin.perfectDays,
      fajrMissed: sinceJoin.missedByPrayer.FAJR,
      totalCompleted: lifetime.completed,
    },
    insights,
    byPrayer,
    stackedWeek,
    weekDays,
    weekLabels,
    moodHistory,
    imanMoodSeries,
    imanMoodCorrelation,
    coaching,
    totals: insights.totals,
    trend: insights.trend,
  });
}
