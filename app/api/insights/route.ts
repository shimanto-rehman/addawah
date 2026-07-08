import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { apiRequireAuth, jsonError, jsonOk } from '@/lib/api-helpers';
import { computePrayerInsights } from '@/lib/prayer-insights';
import { prayerLocationFromUser } from '@/lib/prayer-times';
import { addDays, startOfDay } from '@/lib/salah-utils';

export async function GET() {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  // No location at all → fail closed so the client prompts to set one.
  const location = prayerLocationFromUser(user!);
  if (!location) {
    return jsonError('Location not set. Please set your city to load insights.', 400);
  }

  const today = startOfDay(new Date());
  const start = addDays(today, -13);

  try {
    const records = await prisma.salahRecord.findMany({
      where: {
        userId: user!.id,
        kind: 'FARD',
        date: { gte: start, lte: today },
      },
      select: {
        date: true,
        prayer: true,
        completed: true,
        updatedAt: true,
        completedOnTime: true,
        inJamat: true,
      },
    });

    const insights = await computePrayerInsights(records, location, 14, user!.id);
    return jsonOk(insights);
  } catch (e) {
    logger.error({ route: '/api/insights', err: e }, 'Could not load prayer insights');
    return jsonError('Could not load prayer insights', 502);
  }
}
