import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiRequireAuth, jsonError, jsonOk } from '@/lib/api-helpers';
import { countCompleted, startOfWeek, addDays } from '@/lib/salah-utils';

async function friendWeekRate(userId: string) {
  const weekStart = startOfWeek(new Date());
  const weekEnd = addDays(weekStart, 6);
  const records = await prisma.salahRecord.findMany({
    where: { userId, date: { gte: weekStart, lte: weekEnd } },
  });
  const total = records.length || 35;
  return Math.round((countCompleted(records) / total) * 100);
}

export async function GET() {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const [sent, received] = await Promise.all([
    prisma.friendship.findMany({
      where: { userId: user!.id, status: 'ACCEPTED' },
      include: { friend: { select: { id: true, name: true, email: true, avatarColor: true } } },
    }),
    prisma.friendship.findMany({
      where: { friendId: user!.id, status: 'PENDING' },
      include: { user: { select: { id: true, name: true, email: true, avatarColor: true } } },
    }),
  ]);

  const friends = await Promise.all(
    sent.map(async (f) => ({
      ...f.friend,
      friendshipId: f.id,
      weekRate: await friendWeekRate(f.friend.id),
    }))
  );

  const requests = received.map((r) => ({
    ...r.user,
    friendshipId: r.id,
    status: r.status,
    weekRate: 0,
  }));

  return jsonOk({ friends, requests });
}

const postSchema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  try {
    const body = postSchema.parse(await req.json());
    const friend = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!friend) return jsonError('User not found', 404);
    if (friend.id === user!.id) return jsonError('Cannot add yourself');

    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: user!.id, friendId: friend.id },
          { userId: friend.id, friendId: user!.id },
        ],
      },
    });
    if (existing) return jsonError('Friendship already exists');

    await prisma.friendship.create({
      data: { userId: user!.id, friendId: friend.id, status: 'PENDING' },
    });

    return jsonOk({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError('Invalid email');
    console.error(e);
    return jsonError('Failed to send request', 500);
  }
}

const patchSchema = z.object({
  friendshipId: z.string(),
  action: z.enum(['accept']),
});

export async function PATCH(req: NextRequest) {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  try {
    const body = patchSchema.parse(await req.json());
    const friendship = await prisma.friendship.findUnique({ where: { id: body.friendshipId } });
    if (!friendship || friendship.friendId !== user!.id) return jsonError('Not found', 404);

    await prisma.friendship.update({
      where: { id: body.friendshipId },
      data: { status: 'ACCEPTED' },
    });

    return jsonOk({ ok: true });
  } catch {
    return jsonError('Failed to accept', 500);
  }
}
