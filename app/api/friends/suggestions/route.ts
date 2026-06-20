import { prisma } from '@/lib/prisma';
import { apiRequireAuth, jsonOk } from '@/lib/api-helpers';
import { SEED_USERNAMES, seedProfileByUsername } from '@/lib/seed-users';

export async function GET() {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const [seedUsers, friendships] = await Promise.all([
    prisma.user.findMany({
      where: { username: { in: SEED_USERNAMES } },
      select: {
        id: true,
        name: true,
        username: true,
        avatarColor: true,
        avatarUrl: true,
        goldCoins: true,
      },
    }),
    prisma.friendship.findMany({
      where: {
        OR: [{ userId: user!.id }, { friendId: user!.id }],
      },
      select: { userId: true, friendId: true },
    }),
  ]);

  const linkedIds = new Set<string>();
  for (const f of friendships) {
    linkedIds.add(f.userId === user!.id ? f.friendId : f.userId);
  }

  const suggestions = seedUsers
    .filter((u) => u.id !== user!.id && !linkedIds.has(u.id))
    .map((u) => {
      const profile = seedProfileByUsername(u.username ?? '');
      return {
        id: u.id,
        name: u.name,
        username: u.username,
        avatarColor: u.avatarColor,
        avatarUrl: u.avatarUrl,
        goldCoins: u.goldCoins,
        bio: profile?.bio ?? '',
        mutualFriends: profile?.mutualFriends ?? 0,
      };
    });

  return jsonOk({ suggestions });
}
