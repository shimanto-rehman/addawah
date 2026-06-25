import { prisma } from '@/lib/prisma';
import { apiRequireAuth, jsonOk } from '@/lib/api-helpers';

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 24;

function parsePositiveInt(raw: string | null, fallback: number) {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

export async function GET(request: Request) {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const cursor = parsePositiveInt(searchParams.get('cursor'), 0);
  const requestedLimit = parsePositiveInt(searchParams.get('limit'), DEFAULT_LIMIT);
  const limit = Math.max(1, Math.min(requestedLimit, MAX_LIMIT));

  const myAcceptedFriendships = await prisma.friendship.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [{ userId: user!.id }, { friendId: user!.id }],
    },
    select: { userId: true, friendId: true },
  });

  const myFriendIds = new Set<string>();
  for (const f of myAcceptedFriendships) {
    myFriendIds.add(f.userId === user!.id ? f.friendId : f.userId);
  }

  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ userId: user!.id }, { friendId: user!.id }],
    },
    select: { userId: true, friendId: true, status: true },
  });

  const excludeIds = new Set<string>();
  const requestSentIds = new Set<string>();
  for (const f of friendships) {
    const otherId = f.userId === user!.id ? f.friendId : f.userId;
    if (f.status === 'ACCEPTED') {
      excludeIds.add(otherId);
    } else if (f.userId === user!.id) {
      requestSentIds.add(otherId);
    } else {
      excludeIds.add(otherId);
    }
  }

  const candidates = await prisma.user.findMany({
    where: {
      id: { not: user!.id, notIn: Array.from(excludeIds) },
    },
    select: {
      id: true,
      name: true,
      username: true,
      avatarColor: true,
      avatarUrl: true,
      goldCoins: true,
      city: true,
      country: true,
      createdAt: true,
    },
  });

  const candidateIds = candidates.map((u) => u.id);
  const candidateFriendships =
    candidateIds.length > 0
      ? await prisma.friendship.findMany({
          where: {
            status: 'ACCEPTED',
            OR: [{ userId: { in: candidateIds } }, { friendId: { in: candidateIds } }],
          },
          select: { userId: true, friendId: true },
        })
      : [];

  const candidateFriendsMap = new Map<string, Set<string>>();
  for (const candidateId of candidateIds) {
    candidateFriendsMap.set(candidateId, new Set<string>());
  }
  for (const f of candidateFriendships) {
    if (candidateFriendsMap.has(f.userId)) {
      candidateFriendsMap.get(f.userId)!.add(f.friendId);
    }
    if (candidateFriendsMap.has(f.friendId)) {
      candidateFriendsMap.get(f.friendId)!.add(f.userId);
    }
  }

  const ranked = candidates
    .map((u) => {
      const candidateFriends = candidateFriendsMap.get(u.id) ?? new Set<string>();
      let mutualFriends = 0;
      candidateFriends.forEach((friendId) => {
        if (myFriendIds.has(friendId)) mutualFriends += 1;
      });

      const bio = [u.city, u.country].filter(Boolean).join(' · ') || 'New on Addawah';
      return {
        id: u.id,
        name: u.name,
        username: u.username,
        avatarColor: u.avatarColor,
        avatarUrl: u.avatarUrl,
        goldCoins: u.goldCoins,
        bio,
        mutualFriends,
        requestSent: requestSentIds.has(u.id),
        createdAt: u.createdAt,
      };
    })
    .sort((a, b) => {
      if (b.mutualFriends !== a.mutualFriends) {
        return b.mutualFriends - a.mutualFriends;
      }
      if (a.mutualFriends === 0 && b.mutualFriends === 0) {
        return b.createdAt.getTime() - a.createdAt.getTime();
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

  const paged = ranked.slice(cursor, cursor + limit);
  const nextCursor = cursor + paged.length;
  const hasMore = nextCursor < ranked.length;
  const suggestions = paged.map(({ createdAt: _createdAt, ...person }) => person);

  return jsonOk({ suggestions, nextCursor, hasMore });
}
