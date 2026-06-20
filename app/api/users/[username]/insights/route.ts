import { prisma } from '@/lib/prisma';
import { apiRequireAuth, jsonError, jsonOk } from '@/lib/api-helpers';
import { canView, parseProfilePrivacy } from '@/lib/profile-privacy';
import { computePrayerInsights } from '@/lib/prayer-insights';
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
      profilePrivacy: true,
    },
  });

  if (!profileUser) return jsonError('User not found', 404);

  const privacy = parseProfilePrivacy(profileUser.profilePrivacy);
  const viewerIsSelf = profileUser.id === user!.id;
  if (!canView(privacy, 'showSalahStats', viewerIsSelf)) {
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
      select: { date: true, prayer: true, completed: true, updatedAt: true },
    });

    const city = profileUser.city?.trim() || 'Dhaka';
    const country = profileUser.country?.trim() || 'Bangladesh';
    const insights = await computePrayerInsights(records, city, country, 14);
    return jsonOk(insights);
  } catch (e) {
    console.error(e);
    return jsonError('Could not load prayer insights', 502);
  }
}
