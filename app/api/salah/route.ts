import { NextRequest } from 'next/server';
import { z } from 'zod';
import type { Prayer, SalahKind } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { apiRequireAuth, jsonError, jsonOk } from '@/lib/api-helpers';
import {
  buildSalahGrid,
  dateFromKey,
  rollingWeekStartKey,
  weekRangeFromStartKey,
} from '@/lib/salah-utils';
import { SALAH_GRID_CACHE_HEADERS } from '@/lib/salah-query';
import { fetchPrayerTimesFor, formatDateKeyInTimezone, prayerLocationFromUser } from '@/lib/prayer-times';
import { canMarkSalahCell } from '@/lib/salah-mark-rules';
import { classifySalahMark, isMarkWithinWakt } from '@/lib/prayer-insights-internal';
import { awardGoldCoins, computePrayerReward } from '@/lib/rewards';
import { clearWaktReminderForPrayer } from '@/lib/notifications';
import { triggerSync } from '@/lib/internal-sync';
import { kvDel } from '@/lib/kv';
import { buildStatsPayload } from '@/lib/stats-data';
import { invalidateAnalyticsCache } from '@/lib/analytics-data';
import { logger } from '@/lib/logger';
import type { PrayerName } from '@/lib/constants';



export async function GET(req: NextRequest) {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const weekParam = req.nextUrl.searchParams.get('week');
  let weekStartKey = weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam) ? weekParam : null;
  if (!weekStartKey) {
    const location = prayerLocationFromUser(user!);
    if (!location) {
      return jsonError('Location not set. Please set your city to load salah times.', 400);
    }
    const times = await fetchPrayerTimesFor(location, new Date());
    weekStartKey = rollingWeekStartKey(times.timeZone);
  }
  const { start: weekStart, end: weekEnd } = weekRangeFromStartKey(weekStartKey);

  const records = await prisma.salahRecord.findMany({
    where: {
      userId: user!.id,
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

  return jsonOk({ grid: buildSalahGrid(records) }, 200, SALAH_GRID_CACHE_HEADERS);
}

const postSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  prayer: z.enum(['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA']),
  kind: z.enum(['FARD', 'SUNNAH_BEFORE', 'SUNNAH_AFTER']).default('FARD'),
  unit: z.number().int().min(0).max(3).default(0),
  completed: z.boolean(),
  inJamat: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  try {
    const body = postSchema.parse(await req.json());
    const date = dateFromKey(body.date);
    const now = new Date();
    const location = prayerLocationFromUser(user!);
    if (!location) {
      return jsonError('Location not set. Please set your city to log salah.', 400);
    }
    const times = await fetchPrayerTimesFor(location, now);
    const todayKey = formatDateKeyInTimezone(now, times.timeZone);
    if (body.date > todayKey) return jsonError('Cannot log future prayers');

    if (body.completed) {
      const markCheck = canMarkSalahCell(body.date, body.prayer as PrayerName, times, now);
      if (!markCheck.allowed) {
        if (markCheck.reason === 'wakt-not-started') {
          return jsonError('This wakt has not started yet — wait until adhan time');
        }
        return jsonError('Cannot log future prayers');
      }
    }

    const recordKey = {
      userId: user!.id,
      date,
      prayer: body.prayer as Prayer,
      kind: body.kind as SalahKind,
      unit: body.unit,
    };

    const existing = await prisma.salahRecord.findUnique({
      where: { userId_date_prayer_kind_unit: recordKey },
      select: { completedOnTime: true, inJamat: true },
    });

    const prayerDayTimes =
      body.kind === 'FARD' && body.unit === 0
        ? await fetchPrayerTimesFor(location, date)
        : null;

    const markedInWakt =
      body.completed &&
      prayerDayTimes != null &&
      isMarkWithinWakt(now, body.date, body.prayer as PrayerName, prayerDayTimes);

    const completedOnTime = markedInWakt || (existing?.completedOnTime ?? false);

    await prisma.salahRecord.upsert({
      where: { userId_date_prayer_kind_unit: recordKey },
      create: {
        userId: user!.id,
        date,
        prayer: body.prayer,
        kind: body.kind,
        unit: body.unit,
        completed: body.completed,
        completedOnTime: body.completed ? completedOnTime : false,
        inJamat: body.completed ? body.inJamat : false,
      },
      update: body.completed
        ? { completed: true, completedOnTime, inJamat: body.inJamat }
        : { completed: false, inJamat: false },
    });

    let coinsEarned = 0;
    let timing: 'on-time' | 'kaza' | null = null;

    if (body.kind === 'FARD' && body.unit === 0) {
      if (body.completed) {
        timing = classifySalahMark(
          body.date,
          body.prayer as PrayerName,
          now,
          prayerDayTimes!,
          completedOnTime,
        );

        const [, reward] = await Promise.all([
          clearWaktReminderForPrayer(user!.id, body.prayer, body.date),
          computePrayerReward(
            location,
            body.prayer as PrayerName,
            body.date,
            now,
            times,
            body.inJamat,
          ),
        ]);
        if (reward) {
          await awardGoldCoins(user!.id, reward.amount);
          coinsEarned = reward.amount;
        }
      }
      triggerSync('refresh-snapshots', user!.id);
      // Day-stat refresh handled lazily by ensureSalahDayStats (stale detection via updatedAt)
    }

    let stats;
    if (body.kind === 'FARD' && body.unit === 0) {
      await kvDel(`stats:${user!.id}`).catch(() => {});
      invalidateAnalyticsCache(user!.id);
      stats = await buildStatsPayload(user!.id, { skipCache: true });
    }

    return jsonOk({ ok: true, coinsEarned, timing, stats });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError('Invalid input');
    logger.error({ route: '/api/salah', err: e }, 'Failed to save');
    return jsonError('Failed to save', 500);
  }
}
