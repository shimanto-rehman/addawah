import { PRAYER_LABELS, type PrayerName } from './constants';
import { prisma } from './prisma';
import {
  fetchPrayerTimes,
  formatDateKeyInTimezone,
  getNowMinutesInTimezone,
  isForbiddenForPoke,
  prayerWaktWindow,
  type PrayerTimesPayload,
} from './prayer-times';

export type BadgeTier = {
  id: string;
  name: string;
  minCoins: number;
  icon: string;
  blurb: string;
};

export const BADGE_TIERS: BadgeTier[] = [
  { id: 'seedling', name: 'Seedling', minCoins: 0, icon: '🌱', blurb: 'Beginning the journey' },
  { id: 'guardian', name: 'Wakt Guardian', minCoins: 1000, icon: '🛡️', blurb: 'Steady in prayer time' },
  { id: 'lighthouse', name: 'Lighthouse', minCoins: 5000, icon: '🕌', blurb: 'A light for others' },
  { id: 'mentor', name: 'Dawah Mentor', minCoins: 10000, icon: '📿', blurb: 'Uplifts the ummah' },
  { id: 'crescent', name: 'Crescent Scholar', minCoins: 20000, icon: '🌙', blurb: 'Discipline & mercy' },
  { id: 'golden', name: 'Golden Mu\'min', minCoins: 50000, icon: '✨', blurb: 'Excellence in wakt' },
];

/** Competitive wakt reward — highest at adhan, decays through the window. */
export const PRAYER_REWARD = {
  MAX: 25,
  MIN: 5,
  /** First slice of the wakt keeps full max (e.g. 10% ≈ first ~30 min of a 5h Fajr window). */
  GRACE_RATIO: 0.1,
  /** >1 = sharper drop after grace — rewards praying at the start. */
  DECAY_POWER: 2.2,
} as const;

export const REWARD_POINTS = {
  DAWAH_IN_WAKT: 5,
} as const;

export function getBadgeForCoins(coins: number): BadgeTier {
  let badge = BADGE_TIERS[0];
  for (const tier of BADGE_TIERS) {
    if (coins >= tier.minCoins) badge = tier;
  }
  return badge;
}

export function getNextBadge(coins: number): BadgeTier | null {
  return BADGE_TIERS.find((t) => t.minCoins > coins) ?? null;
}

export async function awardGoldCoins(userId: string, amount: number) {
  if (amount <= 0) return;
  await prisma.user.update({
    where: { id: userId },
    data: { goldCoins: { increment: amount } },
  });
}

function prayerWindow(prayer: PrayerName, times: PrayerTimesPayload) {
  return prayerWaktWindow(prayer, times);
}

export function isWithinWakt(now: Date, prayer: PrayerName, times: PrayerTimesPayload) {
  const { start, end } = prayerWindow(prayer, times);
  const mins = getNowMinutesInTimezone(now, times.timeZone);
  return mins >= start && mins < end;
}

/** Gold for marking fard during wakt — decays as the window progresses. */
export function computeWaktPrayerCoins(
  at: Date,
  prayer: PrayerName,
  times: PrayerTimesPayload,
): number | null {
  const { start, end } = prayerWindow(prayer, times);
  const mins = getNowMinutesInTimezone(at, times.timeZone);
  if (mins < start || mins >= end) return null;

  const span = end - start;
  if (span <= 0) return PRAYER_REWARD.MIN;

  const elapsed = mins - start;
  const ratio = Math.min(1, Math.max(0, elapsed / span));

  if (ratio <= PRAYER_REWARD.GRACE_RATIO) {
    return PRAYER_REWARD.MAX;
  }

  const decayRatio = (ratio - PRAYER_REWARD.GRACE_RATIO) / (1 - PRAYER_REWARD.GRACE_RATIO);
  const curved = Math.pow(decayRatio, PRAYER_REWARD.DECAY_POWER);
  const amount = Math.round(PRAYER_REWARD.MAX - (PRAYER_REWARD.MAX - PRAYER_REWARD.MIN) * curved);
  return Math.max(PRAYER_REWARD.MIN, amount);
}

export async function computeDawahReward(
  city: string | null | undefined,
  country: string | null | undefined,
  prayer: PrayerName,
  at = new Date(),
) {
  try {
    const times = await fetchPrayerTimes(city?.trim() || 'Dhaka', country?.trim() || 'Bangladesh', at);
    if (!isWithinWakt(at, prayer, times)) return null;
    const mins = getNowMinutesInTimezone(at, times.timeZone);
    if (isForbiddenForPoke(times, mins, prayer)) return null;
    return { amount: REWARD_POINTS.DAWAH_IN_WAKT, label: `Dawah in ${PRAYER_LABELS[prayer]} wakt` };
  } catch {
    return null;
  }
}

export async function computePrayerReward(
  city: string | null | undefined,
  country: string | null | undefined,
  prayer: PrayerName,
  prayerDateKey: string,
  loggedAt = new Date(),
) {
  try {
    const times = await fetchPrayerTimes(
      city?.trim() || 'Dhaka',
      country?.trim() || 'Bangladesh',
      loggedAt,
    );

    const todayKey = formatDateKeyInTimezone(loggedAt, times.timeZone);
    if (prayerDateKey !== todayKey) return null;

    const amount = computeWaktPrayerCoins(loggedAt, prayer, times);
    if (amount == null) return null;

    const label =
      amount >= PRAYER_REWARD.MAX
        ? `${PRAYER_LABELS[prayer]} at wakt start`
        : `${PRAYER_LABELS[prayer]} in wakt`;

    return { amount, label, peak: amount >= PRAYER_REWARD.MAX };
  } catch {
    return null;
  }
}

export function activePrayerForNow(times: PrayerTimesPayload, now = new Date()): PrayerName | null {
  const mins = getNowMinutesInTimezone(now, times.timeZone);

  for (const prayer of [...times.prayers].reverse()) {
    const { start, end } = prayerWindow(prayer.prayer, times);
    if (mins >= start && mins < end) return prayer.prayer;
  }

  return null;
}
