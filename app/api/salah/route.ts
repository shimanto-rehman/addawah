import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiRequireAuth, jsonError, jsonOk } from '@/lib/api-helpers';
import {
  addDays,
  buildSalahGrid,
  startOfWeek,
} from '@/lib/salah-utils';
import { awardGoldCoins, computePrayerReward } from '@/lib/rewards';
import type { PrayerName } from '@/lib/constants';

export async function GET(req: NextRequest) {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const weekParam = req.nextUrl.searchParams.get('week');
  const weekStart = weekParam ? new Date(weekParam + 'T00:00:00') : startOfWeek(new Date());
  const weekEnd = addDays(weekStart, 6);

  const records = await prisma.salahRecord.findMany({
    where: {
      userId: user!.id,
      date: { gte: weekStart, lte: weekEnd },
    },
  });

  return jsonOk({ grid: buildSalahGrid(records) });
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
    const date = new Date(body.date + 'T12:00:00');
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (date > today) return jsonError('Cannot log future prayers');

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
    if (body.completed && body.kind === 'FARD' && body.unit === 0) {
      const reward = await computePrayerReward(
        user!.city,
        user!.country,
        body.prayer as PrayerName,
      );
      if (reward) {
        await awardGoldCoins(user!.id, reward.amount);
        coinsEarned = reward.amount;
      }
    }

    return jsonOk({ ok: true, coinsEarned });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError('Invalid input');
    console.error(e);
    return jsonError('Failed to save', 500);
  }
}
