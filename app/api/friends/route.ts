import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiRequireAuth, jsonError, jsonOk } from '@/lib/api-helpers';
import { countCompleted, startOfWeek, addDays } from '@/lib/salah-utils';
import { getBadgeForCoins } from '@/lib/rewards';
import { removeFriendship } from '@/lib/friendship';
import { canView, parseProfilePrivacy } from '@/lib/profile-privacy';
import { maskGoldCoins, maskWeekRate } from '@/lib/profile-privacy-apply';
import {
  notifyConnectionAccepted,
  notifyConnectionRequest,
} from '@/lib/notifications';

const userSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  avatarColor: true,
  avatarUrl: true,
  goldCoins: true,
  city: true,
  country: true,
  profilePrivacy: true,
} as const;

async function friendWeekRate(userId: string) {
  const weekStart = startOfWeek(new Date());
  const weekEnd = addDays(weekStart, 6);
  const records = await prisma.salahRecord.findMany({
    where: { userId, date: { gte: weekStart, lte: weekEnd } },
  });
  const total = records.length || 35;
  return Math.round((countCompleted(records) / total) * 100);
}

function mapFriend(
  u: {
    id: string;
    name: string;
    username: string | null;
    email: string;
    avatarColor: string;
    avatarUrl: string | null;
    goldCoins: number;
    profilePrivacy: unknown;
  },
  friendshipId: string,
  weekRate: number,
  connected: boolean,
) {
  const privacy = parseProfilePrivacy(u.profilePrivacy);
  const viewer = connected ? ('connection' as const) : ('public' as const);
  const showBadge = canView(privacy, 'showBadge', viewer);
  const showPhoto = canView(privacy, 'showAvatarPhoto', viewer);
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    email: u.email,
    avatarColor: u.avatarColor,
    avatarUrl: showPhoto ? u.avatarUrl : null,
    goldCoins: maskGoldCoins(u.goldCoins, privacy, viewer) ?? 0,
    goldCoinsHidden: !canView(privacy, 'showGoldCoins', viewer),
    friendshipId,
    weekRate: maskWeekRate(weekRate, privacy, viewer),
    weekRateHidden: !canView(privacy, 'showSalahStats', viewer),
    badge: showBadge ? getBadgeForCoins(u.goldCoins) : null,
  };
}

export async function GET() {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const [sent, received, recvAccepted] = await Promise.all([
    prisma.friendship.findMany({
      where: { userId: user!.id, status: 'ACCEPTED' },
      include: { friend: { select: userSelect } },
    }),
    prisma.friendship.findMany({
      where: { friendId: user!.id, status: 'PENDING' },
      include: { user: { select: userSelect } },
    }),
    prisma.friendship.findMany({
      where: { friendId: user!.id, status: 'ACCEPTED' },
      include: { user: { select: userSelect } },
    }),
  ]);

  const friendMap = new Map<string, ReturnType<typeof mapFriend>>();

  for (const f of sent) {
    const weekRate = await friendWeekRate(f.friend.id);
    friendMap.set(f.friend.id, mapFriend(f.friend, f.id, weekRate, true));
  }
  for (const f of recvAccepted) {
    if (friendMap.has(f.user.id)) continue;
    const weekRate = await friendWeekRate(f.user.id);
    friendMap.set(f.user.id, mapFriend(f.user, f.id, weekRate, true));
  }

  const friends = Array.from(friendMap.values());
  const requests = received.map((r) => ({
    ...mapFriend(r.user, r.id, 0, false),
    status: r.status,
  }));

  const me = await prisma.user.findUnique({
    where: { id: user!.id },
    select: { goldCoins: true },
  });

  return jsonOk({
    friends,
    requests,
    me: {
      goldCoins: me?.goldCoins ?? 0,
      badge: getBadgeForCoins(me?.goldCoins ?? 0),
    },
  });
}

const postSchema = z.object({
  username: z.string().min(2).max(30).optional(),
  email: z.string().email().optional(),
  userId: z.string().optional(),
}).refine((d) => d.username || d.email || d.userId, { message: 'Username, email, or userId required' });

export async function POST(req: NextRequest) {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

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
    console.error(e);
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
  } catch {
    return jsonError('Failed to update connection', 500);
  }
}
