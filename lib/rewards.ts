import { PRAYER_LABELS, type PrayerName } from './constants';
import { prisma } from './prisma';
import {
  fetchPrayerTimes,
  timeToMinutes,
  type PrayerTimesPayload,
} from './prayer-times';
import { formatDateKey, startOfDay } from './salah-utils';

export type BadgeTier = {
  id: string;
  name: string;
  minCoins: number;
  icon: string;
  blurb: string;
};

export const BADGE_TIERS: BadgeTier[] = [
  { id: 'seedling', name: 'Seedling', minCoins: 0, icon: '🌱', blurb: 'Beginning the journey' },
  { id: 'guardian', name: 'Wakt Guardian', minCoins: 50, icon: '🛡️', blurb: 'Steady in prayer time' },
  { id: 'lighthouse', name: 'Lighthouse', minCoins: 150, icon: '🕌', blurb: 'A light for others' },
  { id: 'mentor', name: 'Dawah Mentor', minCoins: 350, icon: '📿', blurb: 'Uplifts the ummah' },
  { id: 'crescent', name: 'Crescent Scholar', minCoins: 700, icon: '🌙', blurb: 'Discipline & mercy' },
  { id: 'golden', name: 'Golden Mu\'min', minCoins: 1200, icon: '✨', blurb: 'Excellence in wakt' },
];

export const REWARD_POINTS = {
  DAWAH_IN_WAKT: 5,
  PRAYER_IN_WAKT: 10,
  PRAYER_EARLY_BONUS: 5,
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

function prayerWindow(
  prayer: PrayerName,
  times: PrayerTimesPayload,
): { start: number; end: number } {
  const idx = times.prayers.findIndex((p) => p.prayer === prayer);
  const start = times.prayers[idx].minutes;

  if (prayer === 'FAJR') {
    return { start, end: timeToMinutes(times.sunrise) };
  }
  if (prayer === 'ISHA') {
    return { start, end: 24 * 60 };
  }
  return { start, end: times.prayers[idx + 1].minutes };
}

export function isWithinWakt(now: Date, prayer: PrayerName, times: PrayerTimesPayload) {
  const { start, end } = prayerWindow(prayer, times);
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= start && mins < end;
}

export function isEarlyInWakt(now: Date, prayer: PrayerName, times: PrayerTimesPayload) {
  const { start, end } = prayerWindow(prayer, times);
  const mins = now.getHours() * 60 + now.getMinutes();
  const span = end - start;
  if (span <= 0) return false;
  return mins >= start && mins < start + span * 0.25;
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
    return { amount: REWARD_POINTS.DAWAH_IN_WAKT, label: `Dawah in ${PRAYER_LABELS[prayer]} wakt` };
  } catch {
    return null;
  }
}

export async function computePrayerReward(
  city: string | null | undefined,
  country: string | null | undefined,
  prayer: PrayerName,
  loggedAt = new Date(),
) {
  try {
    const times = await fetchPrayerTimes(
      city?.trim() || 'Dhaka',
      country?.trim() || 'Bangladesh',
      loggedAt,
    );
    if (!isWithinWakt(loggedAt, prayer, times)) return null;

    const early = isEarlyInWakt(loggedAt, prayer, times);
    const amount = REWARD_POINTS.PRAYER_IN_WAKT + (early ? REWARD_POINTS.PRAYER_EARLY_BONUS : 0);
    const label = early
      ? `Early ${PRAYER_LABELS[prayer]} in wakt`
      : `${PRAYER_LABELS[prayer]} in wakt`;

    return { amount, label, early };
  } catch {
    return null;
  }
}

export function activePrayerForNow(times: PrayerTimesPayload, now = new Date()): PrayerName | null {
  const today = formatDateKey(now);
  if (formatDateKey(startOfDay(now)) !== today) return null;

  const mins = now.getHours() * 60 + now.getMinutes();

  for (const prayer of [...times.prayers].reverse()) {
    const { start, end } = prayerWindow(prayer.prayer, times);
    if (mins >= start && mins < end) return prayer.prayer;
  }

  return null;
}
