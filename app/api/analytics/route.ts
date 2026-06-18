import { prisma } from '@/lib/prisma';
import { apiRequireAuth, jsonOk } from '@/lib/api-helpers';
import { computeLifetimeStats } from '@/lib/salah-utils';
import { PRAYERS, type PrayerName } from '@/lib/constants';

export async function GET() {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const records = await prisma.salahRecord.findMany({
    where: { userId: user!.id },
    orderBy: { date: 'asc' },
  });

  const lifetime = computeLifetimeStats(records);

  const monthlyMap = new Map<string, { completed: number; total: number }>();
  for (const r of records) {
    const key = r.date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    const cur = monthlyMap.get(key) ?? { completed: 0, total: 0 };
    cur.total += 1;
    if (r.completed) cur.completed += 1;
    monthlyMap.set(key, cur);
  }

  const monthly = Array.from(monthlyMap.entries())
    .slice(-6)
    .map(([month, v]) => ({ month, ...v }));

  return jsonOk({
    byPrayer: lifetime.byPrayer.map((p) => ({
      ...p,
      prayer: p.prayer as PrayerName,
    })),
    monthly,
    lifetimeRate: lifetime.rate,
    totalCompleted: lifetime.completed,
  });
}
