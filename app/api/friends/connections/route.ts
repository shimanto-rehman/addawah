import { prisma } from '@/lib/prisma';
import { apiRequireAuth, jsonOk } from '@/lib/api-helpers';
import { countCompleted, startOfWeek, addDays } from '@/lib/salah-utils';
import { getBadgeForCoins } from '@/lib/rewards';
import { parseProfilePrivacy } from '@/lib/profile-privacy';
import { maskGoldCoins, maskWeekRate } from '@/lib/profile-privacy-apply';

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
  const showBadge = privacy.showBadge;
  const showPhoto = privacy.showAvatarPhoto;
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    email: u.email,
    avatarColor: u.avatarColor,
    avatarUrl: showPhoto ? u.avatarUrl : null,
    goldCoins: maskGoldCoins(u.goldCoins, privacy, false) ?? 0,
    goldCoinsHidden: !privacy.showGoldCoins,
    city: u.city,
    country: u.country,
    friendshipId,
    weekRate: maskWeekRate(weekRate, privacy, false),
    weekRateHidden: !privacy.showSalahStats,
    role,
    badge: showBadge ? getBadgeForCoins(u.goldCoins) : null,
  };
}

export async function GET() {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const [acceptedSent, acceptedRecv, incoming, outgoing] = await Promise.all([
    prisma.friendship.findMany({
      where: { userId: user!.id, status: 'ACCEPTED' },
      include: { friend: { select: userSelect } },
    }),
    prisma.friendship.findMany({
      where: { friendId: user!.id, status: 'ACCEPTED' },
      include: { user: { select: userSelect } },
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

  const friendMap = new Map<string, ReturnType<typeof mapConnection>>();

  for (const f of acceptedSent) {
    const weekRate = await friendWeekRate(f.friend.id);
    friendMap.set(f.friend.id, mapConnection(f.friend, f.id, weekRate, 'friend'));
  }
  for (const f of acceptedRecv) {
    if (friendMap.has(f.user.id)) continue;
    const weekRate = await friendWeekRate(f.user.id);
    friendMap.set(f.user.id, mapConnection(f.user, f.id, weekRate, 'friend'));
  }

  const friends = Array.from(friendMap.values());
  const requests = await Promise.all(
    incoming.map(async (r) =>
      mapConnection(r.user, r.id, 0, 'incoming'),
    ),
  );
  const pending = await Promise.all(
    outgoing.map(async (r) =>
      mapConnection(r.friend, r.id, 0, 'outgoing'),
    ),
  );

  return jsonOk({
    friends,
    requests,
    pending,
    counts: {
      friends: friends.length,
      requests: requests.length,
      pending: pending.length,
    },
  });
}
