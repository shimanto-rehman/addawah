import { prisma } from '@/lib/prisma';
import { apiRequireAuth, jsonError, jsonOk } from '@/lib/api-helpers';
import { getConnectionBetween } from '@/lib/friendship';
import {
  canView,
  parseProfilePrivacy,
  profileViewerFromConnection,
} from '@/lib/profile-privacy';
import { getBadgeForCoins } from '@/lib/rewards';
import { buildPublicUserStatsFromDayStats } from '@/lib/user-public-stats';
import { kvGetJson, kvSetJson } from '@/lib/kv';

const PROFILE_CACHE_TTL = 60; // 1 minute

type RouteParams = { params: { username: string } };

export async function GET(_req: Request, { params }: RouteParams) {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const username = decodeURIComponent(params.username).replace(/^@/, '').trim();
  if (!username) return jsonError('Invalid username', 400);

  // Check cache (keyed by viewer + profile for privacy-aware caching)
  const cacheKey = `profile:${user!.id}:${username.toLowerCase()}`;
  const cached = await kvGetJson<unknown>(cacheKey);
  if (cached) {
    return jsonOk(cached);
  }

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

  const PROFILE_STATS_DAYS = 90;
  const statsCutoff = new Date();
  statsCutoff.setDate(statsCutoff.getDate() - PROFILE_STATS_DAYS);

  // Use precomputed UserSalahDayStat (90 rows) instead of raw SalahRecord (thousands)
  const dayStats = showStats
    ? await prisma.userSalahDayStat.findMany({
        where: { userId: profileUser.id, date: { gte: statsCutoff } },
        select: { date: true, onTime: true, kaza: true, missed: true, pending: true, iman: true },
        orderBy: { date: 'desc' },
      })
    : [];

  const bio = [profileUser.city, profileUser.country].filter(Boolean).join(' · ') || null;
  const rawStats = buildPublicUserStatsFromDayStats(
    profileUser.id,
    profileUser.goldCoins,
    profileUser.createdAt,
    dayStats,
  );

  const showCoins = canView(privacy, 'showGoldCoins', viewer);
  const showBadge = canView(privacy, 'showBadge', viewer);

  const response = {
    profile: {
      id: profileUser.id,
      name: profileUser.name,
      username: profileUser.username,
      avatarColor: profileUser.avatarColor,
      avatarUrl: canView(privacy, 'showAvatarPhoto', viewer) ? profileUser.avatarUrl : null,
      city: canView(privacy, 'showLocation', viewer) ? profileUser.city : null,
      country: canView(privacy, 'showLocation', viewer) ? profileUser.country : null,
      bio,
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
  };

  // Cache for 1 minute
  await kvSetJson(cacheKey, response, PROFILE_CACHE_TTL);

  return jsonOk(response);
}
