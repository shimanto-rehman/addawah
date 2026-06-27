import { prisma } from '@/lib/prisma';
import { apiRequireAuth, jsonOk } from '@/lib/api-helpers';
import { batchFriendWeekRates } from '@/lib/friendship';
import { getBadgeForCoins } from '@/lib/rewards';
import { canView, parseProfilePrivacy } from '@/lib/profile-privacy';
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

  const friendEntries: Array<{
    id: string;
    user: (typeof acceptedSent)[number]['friend'];
    friendshipId: string;
  }> = [];

  for (const f of acceptedSent) {
    friendEntries.push({ id: f.friend.id, user: f.friend, friendshipId: f.id });
  }
  for (const f of acceptedRecv) {
    if (friendEntries.some((entry) => entry.id === f.user.id)) continue;
    friendEntries.push({ id: f.user.id, user: f.user, friendshipId: f.id });
  }

  const weekRates = await batchFriendWeekRates(friendEntries.map((entry) => entry.id));
  const friends = friendEntries.map((entry) =>
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
  });
}
