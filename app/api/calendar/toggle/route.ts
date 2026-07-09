import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiRequireAuth, jsonError, jsonOk } from '@/lib/api-helpers';
import { toggleCalendarAction, loadEventsData, getEventsForHijriDate, getHijriDate } from '@/lib/islamic-calendar';
import { awardGoldCoins } from '@/lib/rewards';
import { computeCalendarActionReward } from '@/lib/calendar-rewards';
import { logger } from '@/lib/logger';

const toggleSchema = z.object({
  eventId: z.string().min(1),
  actionIndex: z.number().int().min(0).max(20),
});

/** POST /api/calendar/toggle — toggle a sunnah action for today */
export async function POST(req: NextRequest) {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const parsed = toggleSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      `Validation failed: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
      400,
    );
  }

  try {
    const { eventId, actionIndex } = parsed.data;

    // Look up the action to compute the reward BEFORE toggling
    const data = await loadEventsData();
    const hijri = getHijriDate();
    const todayEvents = getEventsForHijriDate(data.events, hijri.month, hijri.day, new Date().getDay());
    let targetAction = null;
    let bitOffset = 0;
    for (const ev of todayEvents) {
      if (ev.id === eventId) {
        targetAction = ev.sunnahActions[actionIndex] ?? null;
        break;
      }
      bitOffset += ev.sunnahActions.length;
    }

    if (!targetAction) {
      return jsonError('Action not found for today', 404);
    }

    // Toggle and get the new state
    const result = await toggleCalendarAction(user!.id, eventId, actionIndex);

    // Award coins only on completion (delta > 0), not on un-toggling
    let coinsEarned = 0;
    let rewardLabel: string | null = null;
    if (result.delta > 0) {
      const reward = computeCalendarActionReward(targetAction);
      if (reward) {
        coinsEarned = reward.amount;
        rewardLabel = reward.label;
        await awardGoldCoins(user!.id, reward.amount).catch((err) =>
          logger.error({ route: '/api/calendar/toggle', err }, 'awardGoldCoins failed'),
        );
      }
    }

    return jsonOk({
      ...result,
      coinsEarned,
      rewardLabel,
    });
  } catch (e) {
    logger.error({ route: '/api/calendar/toggle', err: e }, 'Failed');
    return jsonError('Failed to toggle action', 500);
  }
}
