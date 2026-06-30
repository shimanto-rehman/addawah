import { prisma } from '@/lib/prisma';
import { apiRequireAuth, jsonOk } from '@/lib/api-helpers';
import { batchFriendWeekRates } from '@/lib/friendship';
import { getBadgeForCoins } from '@/lib/rewards';
import { canView, parseProfilePrivacy } from '@/lib/profile-privacy';
import { maskGoldCoins, maskWeekRate } from '@/lib/profile-privacy-apply';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function parsePositiveInt(raw: string | null, fallback: number) {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

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

function mapConnection(
  u: {
    id: string;
    name: string;
    username: string | null;
    email: string;
    avatarColor: string;
    avatarUrl: string | null;
    goldCoins: number;
    city: string | null;
    country: string;
    profilePrivacy: unknown;
  },
  friendshipId: string,
  weekRate: number,
  role: 'friend' | 'incoming' | 'outgoing',
) {
  const privacy = parseProfilePrivacy(u.profilePrivacy);
  const viewer = role === 'friend' ? ('connection' as const) : ('public' as const);
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
    city: u.city,
    country: u.country,
    friendshipId,
    weekRate: maskWeekRate(weekRate, privacy, viewer),
    weekRateHidden: !canView(privacy, 'showSalahStats', viewer),
    role,
    badge: showBadge ? getBadgeForCoins(u.goldCoins) : null,
  };
}

export async function GET(request: Request) {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const cursor = parsePositiveInt(searchParams.get('cursor'), 0);
  const requestedLimit = parsePositiveInt(searchParams.get('limit'), DEFAULT_LIMIT);
  const limit = Math.max(1, Math.min(requestedLimit, MAX_LIMIT));

  // Fetch accepted friends with pagination + incoming/outgoing requests (small, no pagination)
  const [acceptedSent, acceptedRecv, incoming, outgoing] = await Promise.all([
    prisma.friendship.findMany({
      where: { userId: user!.id, status: 'ACCEPTED' },
      include: { friend: { select: userSelect } },
      orderBy: { updatedAt: 'desc' },
      skip: cursor,
      take: limit + 1,
    }),
    prisma.friendship.findMany({
      where: { friendId: user!.id, status: 'ACCEPTED' },
      include: { user: { select: userSelect } },
      orderBy: { updatedAt: 'desc' },
      skip: cursor,
      take: limit + 1,
    }),
    prisma.friendship.findMany({
      where: { friendId: user!.id, status: 'PENDING' },
      include: { user: { select: userSelect } },
    }),
    prisma.friendship.findMany({
      where: { userId: user!.id, status: 'PENDING' },
      include: { friend: { select: userSelect } },
    }),
  ]);

  // Merge accepted friends (deduplicate)
  const friendEntries: Array<{
    id: string;
    user: (typeof acceptedSent)[number]['friend'];
    friendshipId: string;
  }> = [];

  const seenIds = new Set<string>();
  for (const f of acceptedSent) {
    if (!seenIds.has(f.friend.id)) {
      seenIds.add(f.friend.id);
      friendEntries.push({ id: f.friend.id, user: f.friend, friendshipId: f.id });
    }
  }
  for (const f of acceptedRecv) {
    if (!seenIds.has(f.user.id)) {
      seenIds.add(f.user.id);
      friendEntries.push({ id: f.user.id, user: f.user, friendshipId: f.id });
    }
  }

  // Check hasMore from the larger of the two queries
  const hasMoreSent = acceptedSent.length > limit;
  const hasMoreRecv = acceptedRecv.length > limit;
  const hasMore = hasMoreSent || hasMoreRecv;

  // Trim to limit
  const pageFriends = friendEntries.slice(0, limit);

  const weekRates = await batchFriendWeekRates(pageFriends.map((entry) => entry.id));
  const friends = pageFriends.map((entry) =>
    mapConnection(entry.user, entry.friendshipId, weekRates.get(entry.id) ?? 0, 'friend'),
  );
  const requests = incoming.map((r) => mapConnection(r.user, r.id, 0, 'incoming'));
  const pending = outgoing.map((r) => mapConnection(r.friend, r.id, 0, 'outgoing'));

  return jsonOk({
    friends,
    requests,
    pending,
    counts: {
      friends: friends.length,
      requests: requests.length,
      pending: pending.length,
    },
    pagination: {
      nextCursor: hasMore ? cursor + limit : null,
      hasMore,
    },
  });
}
