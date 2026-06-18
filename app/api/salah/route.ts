import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiRequireAuth, jsonError, jsonOk } from '@/lib/api-helpers';
import {
  addDays,
  buildSalahGrid,
  startOfWeek,
  formatDateKey,
} from '@/lib/salah-utils';
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
  completed: z.boolean(),
});

export async function POST(req: NextRequest) {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  try {
    const body = postSchema.parse(await req.json());
    const date = new Date(body.date + 'T12:00:00');
    if (date > new Date()) return jsonError('Cannot log future prayers');

    await prisma.salahRecord.upsert({
      where: {
        userId_date_prayer: {
          userId: user!.id,
          date,
          prayer: body.prayer,
        },
      },
      create: {
        userId: user!.id,
        date,
        prayer: body.prayer,
        completed: body.completed,
      },
      update: { completed: body.completed },
    });

    return jsonOk({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError('Invalid input');
    console.error(e);
    return jsonError('Failed to save', 500);
  }
}
