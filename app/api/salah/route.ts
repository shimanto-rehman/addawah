import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiRequireAuth, jsonError, jsonOk } from '@/lib/api-helpers';
import {
  buildSalahGrid,
  dateFromKey,
  formatDateKeyLocal,
  rollingWeekStart,
  weekRangeFromStartKey,
} from '@/lib/salah-utils';
import { DASHBOARD_CACHE_HEADERS } from '@/lib/salah-query';
import { fetchPrayerTimes } from '@/lib/prayer-times';
import { canMarkSalahCell } from '@/lib/salah-mark-rules';
import { awardGoldCoins, computePrayerReward } from '@/lib/rewards';
import { clearWaktReminderForPrayer } from '@/lib/notifications';
import { refreshSnapshotsForSalahUser } from '@/lib/wakt-snapshot';
import { refreshSalahDayStatForUser } from '@/lib/salah-day-stats';
import type { PrayerName } from '@/lib/constants';

export async function GET(req: NextRequest) {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const weekParam = req.nextUrl.searchParams.get('week');
  const weekStartKey =
    weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam)
      ? weekParam
      : formatDateKeyLocal(rollingWeekStart(new Date()));
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
    },
  });

  return jsonOk({ grid: buildSalahGrid(records) }, 200, DASHBOARD_CACHE_HEADERS);
}

const postSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  prayer: z.enum(['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA']),
  kind: z.enum(['FARD', 'SUNNAH_BEFORE', 'SUNNAH_AFTER']).default('FARD'),
  unit: z.number().int().min(0).max(3).default(0),
  completed: z.boolean(),
});

export async function POST(req: NextRequest) {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  try {
    const body = postSchema.parse(await req.json());
    const date = dateFromKey(body.date);
    const todayLocal = formatDateKeyLocal(new Date());
    if (body.date > todayLocal) return jsonError('Cannot log future prayers');

    const now = new Date();

    if (body.completed) {
      const times = await fetchPrayerTimes(
        user!.city?.trim() || 'Dhaka',
        user!.country?.trim() || 'Bangladesh',
        now,
      );
      const markCheck = canMarkSalahCell(body.date, body.prayer as PrayerName, times, now);
      if (!markCheck.allowed) {
        if (markCheck.reason === 'wakt-not-started') {
          return jsonError('This wakt has not started yet — wait until adhan time');
        }
        return jsonError('Cannot log future prayers');
      }
    }

    const existing = await prisma.salahRecord.findFirst({
      where: {
        userId: user!.id,
        date,
        prayer: body.prayer,
        kind: body.kind,
        unit: body.unit,
      },
    });

    if (existing) {
      await prisma.salahRecord.update({
        where: { id: existing.id },
        data: { completed: body.completed },
      });
    } else {
      await prisma.salahRecord.create({
        data: {
          userId: user!.id,
          date,
          prayer: body.prayer,
          kind: body.kind,
          unit: body.unit,
          completed: body.completed,
        },
      });
    }

    let coinsEarned = 0;
    if (body.kind === 'FARD' && body.unit === 0) {
      if (body.completed) {
        await clearWaktReminderForPrayer(user!.id, body.prayer, body.date);

        const reward = await computePrayerReward(
          user!.city,
          user!.country,
          body.prayer as PrayerName,
          body.date,
          now,
        );
        if (reward) {
          await awardGoldCoins(user!.id, reward.amount);
          coinsEarned = reward.amount;
        }
      }
      void refreshSnapshotsForSalahUser(user!.id);
      void refreshSalahDayStatForUser(user!.id, body.date);
    }

    return jsonOk({ ok: true, coinsEarned });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError('Invalid input');
    console.error(e);
    return jsonError('Failed to save', 500);
  }
}
