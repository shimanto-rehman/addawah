import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiRequireAuth, jsonError, jsonOk } from '@/lib/api-helpers';
import {
  buildFriendsHubPayload,
  parseFriendsPageParams,
} from '@/lib/friends-hub';
import { removeFriendship } from '@/lib/friendship';
import {
  notifyConnectionAccepted,
  notifyConnectionRequest,
} from '@/lib/notifications';
import { checkRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const postSchema = z.object({
  username: z.string().min(2).max(30).optional(),
  email: z.string().email().optional(),
  userId: z.string().optional(),
}).refine((d) => d.username || d.email || d.userId, { message: 'Username, email, or userId required' });

export async function GET(req: NextRequest) {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const { cursor, limit } = parseFriendsPageParams(req.nextUrl.searchParams);
  const data = await buildFriendsHubPayload(user!.id, cursor, limit);
  return jsonOk({
    friends: data.friends,
    requests: data.requests,
    me: data.me,
    page: data.page,
  });
}

export async function POST(req: NextRequest) {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const rl = await checkRateLimit(`rl:friends-post:${user!.id}`, 30, 60);
  if (!rl.allowed) {
    return jsonError('Too many requests. Please slow down.', 429);
  }

  try {
    const body = postSchema.parse(await req.json());

    let friend;
    if (body.userId) {
      friend = await prisma.user.findUnique({ where: { id: body.userId } });
    } else {
      const query = body.username?.replace(/^@/, '').toLowerCase() ?? body.email!.toLowerCase();
      friend = body.username
        ? await prisma.user.findFirst({
          where: { username: { equals: query, mode: 'insensitive' } },
        })
        : await prisma.user.findUnique({ where: { email: query } });
    }

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

    const friendship = await prisma.friendship.create({
      data: { userId: user!.id, friendId: friend.id, status: 'PENDING' },
    });

    await notifyConnectionRequest({
      id: friendship.id,
      userId: user!.id,
      friendId: friend.id,
      fromName: user!.name,
    });

    return jsonOk({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError('Invalid username or email');
    logger.error({ route: '/api/friends', action: 'POST', err: e }, 'Failed to send request');
    return jsonError('Failed to send request', 500);
  }
}

const patchSchema = z.object({
  friendshipId: z.string(),
  action: z.enum(['accept', 'disconnect', 'cancel', 'decline']),
});

export async function PATCH(req: NextRequest) {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const rl = await checkRateLimit(`rl:friends-patch:${user!.id}`, 60, 60);
  if (!rl.allowed) {
    return jsonError('Too many requests. Please slow down.', 429);
  }

  try {
    const body = patchSchema.parse(await req.json());
    const friendship = await prisma.friendship.findUnique({ where: { id: body.friendshipId } });
    if (!friendship) return jsonError('Not found', 404);

    if (body.action === 'accept') {
      if (friendship.friendId !== user!.id) return jsonError('Not found', 404);
      await prisma.friendship.update({
        where: { id: body.friendshipId },
        data: { status: 'ACCEPTED' },
      });
      await notifyConnectionAccepted({
        id: friendship.id,
        userId: friendship.userId,
        friendId: friendship.friendId,
        accepterName: user!.name,
      });
      return jsonOk({ ok: true });
    }

    if (body.action === 'decline') {
      if (friendship.friendId !== user!.id || friendship.status !== 'PENDING') {
        return jsonError('Not allowed', 403);
      }
      await prisma.friendship.delete({ where: { id: body.friendshipId } });
      return jsonOk({ ok: true });
    }

    if (body.action === 'cancel') {
      if (friendship.userId !== user!.id || friendship.status !== 'PENDING') {
        return jsonError('Not allowed', 403);
      }
      await prisma.friendship.delete({ where: { id: body.friendshipId } });
      return jsonOk({ ok: true });
    }

    if (body.action === 'disconnect') {
      if (friendship.status !== 'ACCEPTED') return jsonError('Not connected', 400);
      const result = await removeFriendship(body.friendshipId, user!.id);
      if (!result.ok) return jsonError(result.error, result.error === 'Not allowed' ? 403 : 404);
      return jsonOk({ ok: true });
    }

    return jsonError('Unknown action', 400);
  } catch (e) {
    logger.error({ route: '/api/friends', action: 'PATCH', err: e }, 'Failed to update connection');
    return jsonError('Failed to update connection', 500);
  }
}
