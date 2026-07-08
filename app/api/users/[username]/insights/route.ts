import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { apiRequireAuth, jsonError, jsonOk } from '@/lib/api-helpers';
import { getConnectionBetween } from '@/lib/friendship';
import {
  canView,
  parseProfilePrivacy,
  profileViewerFromConnection,
} from '@/lib/profile-privacy';
import { computePrayerInsights } from '@/lib/prayer-insights';
import { prayerLocationFromUser } from '@/lib/prayer-times';
import { addDays, startOfDay } from '@/lib/salah-utils';

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
      city: true,
      country: true,
      latitude: true,
      longitude: true,
      profilePrivacy: true,
    },
  });

  if (!profileUser) return jsonError('User not found', 404);

  const privacy = parseProfilePrivacy(profileUser.profilePrivacy);
  const connection = await getConnectionBetween(user!.id, profileUser.id);
  const viewer = profileViewerFromConnection(connection.status);

  if (!canView(privacy, 'showSalahStats', viewer)) {
    return jsonError('Salah statistics are private', 403);
  }

  const today = startOfDay(new Date());
  const start = addDays(today, -13);

  try {
    const records = await prisma.salahRecord.findMany({
      where: {
        userId: profileUser.id,
        kind: 'FARD',
        date: { gte: start, lte: today },
      },
      select: { date: true, prayer: true, completed: true, updatedAt: true, completedOnTime: true },
    });
    const location = prayerLocationFromUser(profileUser);
    if (!location) return jsonError('Location not set for this user.', 400);
    const insights = await computePrayerInsights(records, location, 14, profileUser.id);
    return jsonOk(insights);
  } catch (e) {
    logger.error({ route: '/api/users/[username]/insights', err: e }, 'Could not load prayer insights');
    return jsonError('Could not load prayer insights', 502);
  }
}
