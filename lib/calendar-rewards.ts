/**
 * Calendar Sunnah Action Rewards
 *
 * Each sunnah action in the Islamic calendar has a static `reward` value (gold coins).
 * This module computes the reward for a completed action, consistent with the
 * reward system in lib/rewards.ts.
 *
 * Pattern: compute → awardGoldCoins in the API route → expose `coinsEarned`.
 */

import type { SunnahAction } from '@/lib/islamic-calendar';

export type CalendarRewardResult = {
  amount: number;
  label: string;
} | null;

/**
 * Compute the reward for completing a sunnah action.
 *
 * The reward is defined statically in islamic-events.json (5–15 coins).
 * Returns null if the action has no reward (reward = 0).
 */
export function computeCalendarActionReward(action: SunnahAction): CalendarRewardResult {
  if (action.reward <= 0) return null;
  return {
    amount: action.reward,
    label: action.title,
  };
}
