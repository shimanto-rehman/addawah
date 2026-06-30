import { PRAYER_LABELS, PRAYERS, type PrayerName } from './constants';
import {
  addDays,
  computeLifetimeSinceJoin,
  computeStreak,
  countCompleted,
  isFardRecord,
  startOfWeek,
} from './salah-utils';

type SalahRecordRow = {
  date: Date;
  prayer: string;
  completed: boolean;
  kind?: string;
};

type DayStatRow = {
  date: Date;
  onTime: number;
  kaza: number;
  missed: number;
  pending: number;
  iman: number;
};

export type PublicUserStats = {
  weekRate: number;
  weekCompleted: number;
  weekTotal: number;
  streak: number;
  lifetimeRate: number;
  lifetimePrayed: number;
  lifetimeMissed: number;
  perfectDays: number;
  activeDays: number;
  daysOnApp: number;
  fajrMissed: number;
  bestPrayer: { prayer: PrayerName; label: string; rate: number } | null;
  goldCoins: number;
  isDemoFilled: boolean;
};

function hashSeed(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededInt(seed: number, min: number, max: number) {
  const span = max - min + 1;
  return min + (seed % span);
}

/** Deterministic placeholder stats until a user has enough logged salah data. */
function demoStatsForUser(userId: string): Omit<PublicUserStats, 'goldCoins' | 'isDemoFilled'> {
  let seed = hashSeed(userId);
  const next = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed;
  };

  const weekRate = seededInt(next(), 52, 96);
  const weekTotal = 35;
  const weekCompleted = Math.round((weekRate / 100) * weekTotal);
  const lifetimeRate = seededInt(next(), 58, 94);
  const daysOnApp = seededInt(next(), 45, 320);
  const lifetimeExpected = daysOnApp * PRAYERS.length;
  const lifetimePrayed = Math.round((lifetimeRate / 100) * lifetimeExpected);
  const lifetimeMissed = Math.max(0, lifetimeExpected - lifetimePrayed);
  const prayerIdx = seededInt(next(), 0, PRAYERS.length - 1);
  const bestPrayerName = PRAYERS[prayerIdx];

  return {
    weekRate,
    weekCompleted,
    weekTotal,
    streak: seededInt(next(), 3, 28),
    lifetimeRate,
    lifetimePrayed,
    lifetimeMissed,
    perfectDays: seededInt(next(), 8, 64),
    activeDays: seededInt(next(), 20, daysOnApp),
    daysOnApp,
    fajrMissed: seededInt(next(), 2, 48),
    bestPrayer: {
      prayer: bestPrayerName,
      label: PRAYER_LABELS[bestPrayerName],
      rate: seededInt(next(), 72, 99),
    },
  };
}

export function buildPublicUserStats(
  userId: string,
  goldCoins: number,
  joinedAt: Date,
  records: SalahRecordRow[],
): PublicUserStats {
  const fardRecords = records.filter(isFardRecord);
  const sinceJoin = computeLifetimeSinceJoin(joinedAt, records);
  const hasRealData = sinceJoin.lifetimeExpected >= 35;

  if (!hasRealData) {
    return {
      ...demoStatsForUser(userId),
      goldCoins,
      isDemoFilled: true,
    };
  }

  const weekStart = startOfWeek(new Date());
  const weekEnd = addDays(weekStart, 6);
  const weekRecords = fardRecords.filter((r) => {
    const t = r.date.getTime();
    return t >= weekStart.getTime() && t <= weekEnd.getTime();
  });
  const weekTotal = 7 * PRAYERS.length;
  const weekCompleted = countCompleted(weekRecords);

  return {
    weekRate: weekTotal ? Math.round((weekCompleted / weekTotal) * 100) : 0,
    weekCompleted,
    weekTotal,
    streak: computeStreak(records),
    lifetimeRate: sinceJoin.lifetimeRate,
    lifetimePrayed: sinceJoin.lifetimePrayed,
    lifetimeMissed: sinceJoin.lifetimeMissed,
    perfectDays: sinceJoin.perfectDays,
    activeDays: sinceJoin.activeDays,
    daysOnApp: sinceJoin.daysOnApp,
    fajrMissed: sinceJoin.missedByPrayer.FAJR,
    bestPrayer: sinceJoin.bestPrayer
      ? {
          prayer: sinceJoin.bestPrayer.prayer as PrayerName,
          label: PRAYER_LABELS[sinceJoin.bestPrayer.prayer as PrayerName],
          rate: sinceJoin.bestPrayer.rate,
        }
      : null,
    goldCoins,
    isDemoFilled: false,
  };
}

export function userProfilePath(username: string) {
  return `/u/${encodeURIComponent(username.toLowerCase())}`;
}

/**
 * Build public user stats from precomputed UserSalahDayStat rows.
 * Uses 90 rows (one per day) instead of thousands of raw SalahRecord rows.
 */
export function buildPublicUserStatsFromDayStats(
  userId: string,
  goldCoins: number,
  joinedAt: Date,
  dayStats: DayStatRow[],
): PublicUserStats {
  if (dayStats.length === 0) {
    return {
      ...demoStatsForUser(userId),
      goldCoins,
      isDemoFilled: true,
    };
  }

  const totalPrayersInStats = dayStats.length * PRAYERS.length;
  const totalOnTime = dayStats.reduce((sum, d) => sum + d.onTime, 0);
  const totalKaza = dayStats.reduce((sum, d) => sum + d.kaza, 0);
  const totalMissed = dayStats.reduce((sum, d) => sum + d.missed, 0);
  const totalPrayed = totalOnTime + totalKaza;

  // Week stats from last 7 days
  const weekStats = dayStats.slice(0, 7);
  const weekTotal = weekStats.length * PRAYERS.length;
  const weekCompleted = weekStats.reduce((sum, d) => sum + d.onTime + d.kaza, 0);

  // Streak: count consecutive days with all prayers completed (onTime + kaza = 5)
  let streak = 0;
  for (const day of dayStats) {
    if (day.onTime + day.kaza >= PRAYERS.length) {
      streak++;
    } else {
      break;
    }
  }

  // Perfect days: all 5 prayers on time
  const perfectDays = dayStats.filter((d) => d.onTime >= PRAYERS.length).length;

  // Active days: at least 1 prayer completed
  const activeDays = dayStats.filter((d) => d.onTime + d.kaza > 0).length;

  // Days on app: from joined date to now
  const now = new Date();
  const daysOnApp = Math.max(1, Math.ceil((now.getTime() - joinedAt.getTime()) / (1000 * 60 * 60 * 24)));

  // Fajr missed: sum of missed prayers where the day had a missed prayer
  // Since we don't have per-prayer breakdown in day stats, estimate from total missed
  const fajrMissed = Math.round(totalMissed / PRAYERS.length);

  // Best prayer: not available from day stats, use null
  const bestPrayer = null;

  const lifetimeRate = totalPrayersInStats > 0
    ? Math.round((totalPrayed / totalPrayersInStats) * 100)
    : 0;

  return {
    weekRate: weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0,
    weekCompleted,
    weekTotal,
    streak,
    lifetimeRate,
    lifetimePrayed: totalPrayed,
    lifetimeMissed: totalMissed,
    perfectDays,
    activeDays,
    daysOnApp,
    fajrMissed,
    bestPrayer,
    goldCoins,
    isDemoFilled: false,
  };
}
