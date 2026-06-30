import { prisma } from '@/lib/prisma';
import { apiRequireAuth, jsonOk } from '@/lib/api-helpers';
import { kvGetJson, kvSetJson } from '@/lib/kv';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const CACHE_TTL_SECONDS = 600; // 10 minutes

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

  // Check Redis cache first
  const cacheKey = `suggest:${user!.id}:${cursor}:${limit}`;
  const cached = await kvGetJson<{ suggestions: unknown[]; nextCursor: number | null; hasMore: boolean }>(cacheKey);
  if (cached) {
    return jsonOk(cached);
  }

  // Step 1: Fetch existing connection IDs (accepted + pending) via targeted SQL
  const [acceptedSent, acceptedRecv, pendingRecv] = await Promise.all([
    prisma.friendship.findMany({
      where: { userId: user!.id, status: 'ACCEPTED' },
      select: { friendId: true },
    }),
    prisma.friendship.findMany({
      where: { friendId: user!.id, status: 'ACCEPTED' },
      select: { userId: true },
    }),
    prisma.friendship.findMany({
      where: { friendId: user!.id, status: 'PENDING' },
      select: { userId: true },
    }),
  ]);

  const excludeIds = new Set<string>();
  const myFriendIds = new Set<string>();
  for (const f of acceptedSent) {
    excludeIds.add(f.friendId);
    myFriendIds.add(f.friendId);
  }
  for (const f of acceptedRecv) {
    excludeIds.add(f.userId);
    myFriendIds.add(f.userId);
  }
  for (const f of pendingRecv) {
    excludeIds.add(f.userId);
  }

  // Find users where I already sent a pending request (to show "requestSent" flag)
  const pendingSent = await prisma.friendship.findMany({
    where: { userId: user!.id, status: 'PENDING' },
    select: { friendId: true },
  });
  const requestSentIds = new Set(pendingSent.map((f) => f.friendId));

  // Step 2: Fetch candidates with DB-level pagination (no full table scan)
  const excludeArray = Array.from(excludeIds);
  const candidates = await prisma.user.findMany({
    where: {
      id: {
        not: user!.id,
        ...(excludeArray.length > 0 ? { notIn: excludeArray } : {}),
      },
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
    orderBy: { createdAt: 'desc' },
    skip: cursor,
    take: limit + 1, // fetch one extra to check hasMore
  });

  const hasMore = candidates.length > limit;
  const page = candidates.slice(0, limit);

  // Step 3: Count mutual friends in batch (single query)
  const candidateIds = page.map((u) => u.id);
  let mutualCountMap = new Map<string, number>();

  if (candidateIds.length > 0 && myFriendIds.size > 0) {
    // Find accepted friendships where candidate is friends with someone in my friend set
    const mutualFriendships = await prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [
          { userId: { in: candidateIds }, friendId: { in: Array.from(myFriendIds) } },
          { friendId: { in: candidateIds }, userId: { in: Array.from(myFriendIds) } },
        ],
      },
      select: { userId: true, friendId: true },
    });

    mutualCountMap = new Map(candidateIds.map((id) => [id, 0]));
    for (const f of mutualFriendships) {
      // If userId is a candidate and friendId is in my friends
      if (myFriendIds.has(f.friendId) && mutualCountMap.has(f.userId)) {
        mutualCountMap.set(f.userId, mutualCountMap.get(f.userId)! + 1);
      }
      // If friendId is a candidate and userId is in my friends
      if (myFriendIds.has(f.userId) && mutualCountMap.has(f.friendId)) {
        mutualCountMap.set(f.friendId, mutualCountMap.get(f.friendId)! + 1);
      }
    }
  }

  // Step 4: Rank and format
  const suggestions = page
    .map((u) => {
      const bio = [u.city, u.country].filter(Boolean).join(' · ') || 'New on Addawah';
      return {
        id: u.id,
        name: u.name,
        username: u.username,
        avatarColor: u.avatarColor,
        avatarUrl: u.avatarUrl,
        goldCoins: u.goldCoins,
        bio,
        mutualFriends: mutualCountMap.get(u.id) ?? 0,
        requestSent: requestSentIds.has(u.id),
        createdAt: u.createdAt,
      };
    })
    .sort((a, b) => {
      if (b.mutualFriends !== a.mutualFriends) {
        return b.mutualFriends - a.mutualFriends;
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

  const nextCursor = hasMore ? cursor + limit : null;
  const result = suggestions.map(({ createdAt: _createdAt, ...person }) => person);

  const response = { suggestions: result, nextCursor, hasMore };

  // Cache in Redis for 10 minutes
  await kvSetJson(cacheKey, response, CACHE_TTL_SECONDS);

  return jsonOk(response);
}
