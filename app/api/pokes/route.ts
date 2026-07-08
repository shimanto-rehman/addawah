import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiRequireAuth, jsonError, jsonOk } from '@/lib/api-helpers';
import { type PrayerName } from '@/lib/constants';
import { buildFriendWaktRow } from '@/lib/friends-wakt';
import { prayerLocationFromUser } from '@/lib/prayer-times';
import { startOfDay } from '@/lib/salah-utils';
import {
  awardGoldCoins,
  computeDawahReward,
} from '@/lib/rewards';
import { POKE_COOLDOWN_MS, pokeCooldownMessage } from '@/lib/poke-cooldown';
import { notifyDawahPoke } from '@/lib/notifications';
import { checkRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const schema = z.object({
  friendId: z.string(),
  prayer: z.enum(['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA']).optional(),
});

export async function POST(req: NextRequest) {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const rl = await checkRateLimit(`rl:pokes:${user!.id}`, 20, 60);
  if (!rl.allowed) {
    return jsonError('Too many reminders. Please slow down.', 429);
  }

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

    const friend = await prisma.user.findUnique({
      where: { id: body.friendId },
      select: { id: true, city: true, country: true, latitude: true, longitude: true },
    });
    if (!friend) return jsonError('User not found', 404);

    const prayer = body.prayer as PrayerName | undefined;
    const today = startOfDay(new Date());

    if (prayer) {
      const records = await prisma.salahRecord.findMany({
        where: { userId: friend.id, kind: 'FARD', date: today },
        select: { prayer: true, completed: true, updatedAt: true, completedOnTime: true },
      });
      const wakt = await buildFriendWaktRow(friend.id, friend.city, friend.country, records);

      if (!wakt.canPoke || wakt.prayer !== prayer) {
        const reason = wakt.forbiddenNow
          ? 'Forbidden time — cannot send dawah reminder now'
          : 'This friend cannot be reminded for this prayer right now';
        return jsonError(reason, 400);
      }
    }

    const recentPoke = await prisma.poke.findFirst({
      where: {
        fromUserId: user!.id,
        toUserId: body.friendId,
        createdAt: { gte: new Date(Date.now() - POKE_COOLDOWN_MS) },
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (recentPoke) {
      return jsonError(pokeCooldownMessage(recentPoke.createdAt), 429);
    }

    const poke = await prisma.poke.create({
      data: {
        fromUserId: user!.id,
        toUserId: body.friendId,
        prayer: prayer ?? null,
        message: prayer
          ? `Assalamu Alaikum — ${prayer} wakt is active. May Allah make it easy for you 🤲`
          : 'Assalamu Alaikum — a gentle reminder to keep up with your salah today 🤲',
      },
    });

    await notifyDawahPoke({
      id: poke.id,
      fromUserId: user!.id,
      toUserId: body.friendId,
      prayer: poke.prayer,
      fromName: user!.name,
    });

    let coinsEarned = 0;
    if (prayer) {
      const friendLocation = prayerLocationFromUser(friend);
      const reward = await computeDawahReward(friendLocation, prayer);
      if (reward) {
        await awardGoldCoins(user!.id, reward.amount);
        coinsEarned = reward.amount;
      }
    }

    return jsonOk({ ok: true, coinsEarned });
  } catch (e) {
    logger.error({ route: '/api/pokes', err: e }, 'Failed to send reminder');
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
