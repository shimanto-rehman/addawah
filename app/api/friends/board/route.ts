import { prisma } from '@/lib/prisma';
import { apiRequireAuth, jsonOk } from '@/lib/api-helpers';
import { startOfDay } from '@/lib/salah-utils';
import { getBadgeForCoins } from '@/lib/rewards';
import { buildFriendWaktRow } from '@/lib/friends-wakt';
import { canView, parseProfilePrivacy } from '@/lib/profile-privacy';
import { maskGoldCoins, privateWaktRow } from '@/lib/profile-privacy-apply';
import { POKE_COOLDOWN_MS, applyPokeCooldown } from '@/lib/poke-cooldown';

const userSelect = {
  id: true,
  name: true,
  username: true,
  avatarColor: true,
  avatarUrl: true,
  goldCoins: true,
  city: true,
  country: true,
  profilePrivacy: true,
} as const;

export async function GET() {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const friendships = await prisma.friendship.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [{ userId: user!.id }, { friendId: user!.id }],
    },
    include: {
      user: { select: userSelect },
      friend: { select: userSelect },
    },
  });

  const today = startOfDay(new Date());
  const friendUsers = friendships.map((f) =>
    f.userId === user!.id ? f.friend : f.user,
  );
  const uniqueFriends = Array.from(
    new Map(friendUsers.map((u) => [u.id, u])).values(),
  );
  const friendIds = uniqueFriends.map((f) => f.id);

  const recentPokes =
    friendIds.length > 0
      ? await prisma.poke.findMany({
          where: {
            fromUserId: user!.id,
            toUserId: { in: friendIds },
            createdAt: { gte: new Date(Date.now() - POKE_COOLDOWN_MS) },
          },
          select: { toUserId: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        })
      : [];

  const lastPokeByFriend = new Map<string, Date>();
  for (const poke of recentPokes) {
    if (!lastPokeByFriend.has(poke.toUserId)) {
      lastPokeByFriend.set(poke.toUserId, poke.createdAt);
    }
  }

  const board = await Promise.all(
    uniqueFriends.map(async (friend) => {
      const privacy = parseProfilePrivacy(friend.profilePrivacy);
      const viewer = 'connection' as const;
      const showWakt = canView(privacy, 'showWaktStatus', viewer);
      const showPhoto = canView(privacy, 'showAvatarPhoto', viewer);
      const showCoins = canView(privacy, 'showGoldCoins', viewer);
      const showBadge = canView(privacy, 'showBadge', viewer);

      let wakt;
      if (!showWakt) {
        wakt = privateWaktRow();
      } else {
        const records = await prisma.salahRecord.findMany({
          where: {
            userId: friend.id,
            kind: 'FARD',
            date: today,
          },
          select: { prayer: true, completed: true, updatedAt: true },
        });
        wakt = await buildFriendWaktRow(
          friend.id,
          friend.city,
          friend.country,
          records,
        );
        wakt = applyPokeCooldown(wakt, lastPokeByFriend.get(friend.id));
      }

      const goldCoins = friend.goldCoins;
      return {
        id: friend.id,
        name: friend.name,
        username: friend.username,
        avatarColor: friend.avatarColor,
        avatarUrl: showPhoto ? friend.avatarUrl : null,
        goldCoins: maskGoldCoins(goldCoins, privacy, viewer) ?? 0,
        goldCoinsHidden: !showCoins,
        badge: showBadge ? getBadgeForCoins(goldCoins) : null,
        wakt,
      };
    }),
  );

  return jsonOk({ board, updatedAt: new Date().toISOString() });
}
