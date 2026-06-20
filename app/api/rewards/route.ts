import { apiRequireAuth, jsonOk } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';
import { BADGE_TIERS, getBadgeForCoins, getNextBadge } from '@/lib/rewards';

export async function GET() {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const me = await prisma.user.findUnique({
    where: { id: user!.id },
    select: { goldCoins: true },
  });

  const coins = me?.goldCoins ?? 0;

  return jsonOk({
    goldCoins: coins,
    badge: getBadgeForCoins(coins),
    nextBadge: getNextBadge(coins),
    tiers: BADGE_TIERS,
  });
}
