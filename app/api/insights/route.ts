import { prisma } from '@/lib/prisma';
import { apiRequireAuth, jsonError, jsonOk } from '@/lib/api-helpers';
import { computePrayerInsights } from '@/lib/prayer-insights';
import { addDays, startOfDay } from '@/lib/salah-utils';

export async function GET() {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const city = user!.city?.trim() || 'Dhaka';
  const country = user!.country?.trim() || 'Bangladesh';
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
      },
    });

    const insights = await computePrayerInsights(records, city, country, 14, user!.id);
    return jsonOk(insights);
  } catch (e) {
    console.error(e);
    return jsonError('Could not load prayer insights', 502);
  }
}
