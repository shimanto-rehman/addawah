import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiRequireAuth, jsonError, jsonOk } from '@/lib/api-helpers';
import { PRAYERS, type PrayerName } from '@/lib/constants';
import {
  awardGoldCoins,
  computeDawahReward,
} from '@/lib/rewards';

const schema = z.object({
  friendId: z.string(),
  prayer: z.enum(['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA']).optional(),
});

export async function POST(req: NextRequest) {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  try {
    const body = schema.parse(await req.json());

    const friendship = await prisma.friendship.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { userId: user!.id, friendId: body.friendId },
          { userId: body.friendId, friendId: user!.id },
        ],
      },
    });
    if (!friendship) return jsonError('Not friends with this user', 403);

    const prayer = body.prayer as PrayerName | undefined;

    await prisma.poke.create({
      data: {
        fromUserId: user!.id,
        toUserId: body.friendId,
        prayer: prayer ?? null,
        message: prayer
          ? `Assalamu Alaikum — ${prayer} wakt is active. May Allah make it easy for you 🤲`
          : 'Assalamu Alaikum — a gentle reminder to keep up with your salah today 🤲',
      },
    });

    let coinsEarned = 0;
    if (prayer) {
      const reward = await computeDawahReward(user!.city, user!.country, prayer);
      if (reward) {
        await awardGoldCoins(user!.id, reward.amount);
        coinsEarned = reward.amount;
      }
    }

    return jsonOk({ ok: true, coinsEarned });
  } catch {
    return jsonError('Failed to send reminder', 500);
  }
}

export async function GET() {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const pokes = await prisma.poke.findMany({
    where: { toUserId: user!.id, readAt: null },
    include: { fromUser: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return jsonOk({ pokes });
}
