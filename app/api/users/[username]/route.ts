import { prisma } from '@/lib/prisma';
import { apiRequireAuth, jsonError, jsonOk } from '@/lib/api-helpers';
import { getConnectionBetween } from '@/lib/friendship';
import {
  canView,
  parseProfilePrivacy,
  profileViewerFromConnection,
} from '@/lib/profile-privacy';
import { getBadgeForCoins } from '@/lib/rewards';
import { seedProfileByUsername } from '@/lib/seed-users';
import { buildPublicUserStats } from '@/lib/user-public-stats';

type RouteParams = { params: { username: string } };

export async function GET(_req: Request, { params }: RouteParams) {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const username = decodeURIComponent(params.username).replace(/^@/, '').trim();
  if (!username) return jsonError('Invalid username', 400);

  const profileUser = await prisma.user.findFirst({
    where: { username: { equals: username, mode: 'insensitive' } },
    select: {
      id: true,
      name: true,
      username: true,
      avatarColor: true,
      avatarUrl: true,
      city: true,
      country: true,
      goldCoins: true,
      profilePrivacy: true,
      createdAt: true,
    },
  });

  if (!profileUser) return jsonError('User not found', 404);

  const privacy = parseProfilePrivacy(profileUser.profilePrivacy);
  const connection = await getConnectionBetween(user!.id, profileUser.id);
  const viewer = profileViewerFromConnection(connection.status);
  const viewerIsSelf = viewer === 'self';

  const showStats = canView(privacy, 'showSalahStats', viewer);

  const records = showStats
    ? await prisma.salahRecord.findMany({
        where: { userId: profileUser.id },
        select: { date: true, prayer: true, completed: true, kind: true },
      })
    : [];

  const seedBio = seedProfileByUsername(profileUser.username ?? '');
  const rawStats = buildPublicUserStats(
    profileUser.id,
    profileUser.goldCoins,
    profileUser.createdAt,
    records,
  );

  const showCoins = canView(privacy, 'showGoldCoins', viewer);
  const showBadge = canView(privacy, 'showBadge', viewer);

  return jsonOk({
    profile: {
      id: profileUser.id,
      name: profileUser.name,
      username: profileUser.username,
      avatarColor: profileUser.avatarColor,
      avatarUrl: canView(privacy, 'showAvatarPhoto', viewer) ? profileUser.avatarUrl : null,
      city: canView(privacy, 'showLocation', viewer) ? profileUser.city : null,
      country: canView(privacy, 'showLocation', viewer) ? profileUser.country : null,
      bio: seedBio?.bio ?? null,
      memberSince: canView(privacy, 'showMemberSince', viewer)
        ? profileUser.createdAt.toISOString()
        : null,
      badge: showBadge ? getBadgeForCoins(profileUser.goldCoins) : null,
    },
    stats: showStats
      ? {
          ...rawStats,
          goldCoins: showCoins ? rawStats.goldCoins : null,
        }
      : null,
    statsHidden: !showStats,
    connection,
    viewerIsSelf,
    privacy: viewerIsSelf ? privacy : undefined,
  });
}
