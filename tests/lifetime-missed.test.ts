import { describe, it, expect } from 'vitest';
import type { PrayerTimesPayload, PrayerSlot } from '@/lib/prayer-times';
import type { PrayerName } from '@/lib/constants';
import { PRAYERS } from '@/lib/constants';
import {
  computeLifetimeSinceJoin,
  getLifetimeMissedBreakdown,
} from '@/lib/salah-utils';

/**
 * Build a deterministic PrayerTimesPayload for Asia/Dhaka on a given date.
 * Times chosen so we can control whether `now` is before/after each wakt.
 *   Fajr: 05:00 → sunrise 06:15  (wakt ends at sunrise)
 *   Dhuhr: 12:00 → Asr 16:00
 *   Asr: 16:00 → Maghrib 18:00
 *   Maghrib: 18:00 → Isha 19:30
 *   Isha: 19:30 → 24:00
 */
function makeTimes(dateKey: string): PrayerTimesPayload {
  const slots: Record<PrayerName, string> = {
    FAJR: '05:00',
    DHUHR: '12:00',
    ASR: '16:00',
    MAGHRIB: '18:00',
    ISHA: '19:30',
  };
  const prayers: PrayerSlot[] = PRAYERS.map((p) => ({
    prayer: p,
    label: p,
    time: slots[p],
    minutes: Number(slots[p].slice(0, 2)) * 60 + Number(slots[p].slice(3, 5)),
  }));
  return {
    city: 'Dhaka',
    country: 'Bangladesh',
    date: dateKey,
    prayers,
    forbidden: [],
    sunrise: '06:15',
    timeZone: 'Asia/Dhaka',
    fetchedAt: new Date().toISOString(),
  };
}

describe('lifetime missed — today gap', () => {
  it('counts untouched prayers as missed once their wakt has passed', () => {
    // Today = 2025-06-10, 14:30 Dhaka time. Fajr (05:00→06:15) and
    // Dhuhr (12:00→16:00... but we're at 14:30 so wakt still open? No —
    // 14:30 < 16:00 so Dhuhr still pending). Use 17:00 so Dhuhr passed.
    // At 17:00: Fajr passed, Dhuhr passed (wakt 12:00-16:00), Asr still in wakt.
    const now = new Date('2025-06-10T17:00:00+06:00');
    const todayKey = '2025-06-10';
    const times = makeTimes(todayKey);

    // User first prayed 2 days ago (so tracking window = 2 days ago → today).
    const records = [
      // 2025-06-08: all 5 prayed
      ...PRAYERS.map((p) => ({ date: new Date('2025-06-08T00:00:00Z'), prayer: p, completed: true })),
      // 2025-06-09: all 5 prayed
      ...PRAYERS.map((p) => ({ date: new Date('2025-06-09T00:00:00Z'), prayer: p, completed: true })),
      // Today: NOTHING touched. No rows at all for Fajr/Dhuhr.
    ];

    const stats = computeLifetimeSinceJoin(new Date('2025-06-07'), records, times, now);

    // Fajr wakt passed (ended 06:15), never logged → MUST be missed.
    // Dhuhr wakt passed (ended 16:00), never logged → MUST be missed.
    // Asr still in wakt (16:00-18:00, now 17:00) → pending, not counted.
    // Maghrib/Isha upcoming → pending.
    expect(stats.missedByPrayer.FAJR).toBe(1);
    expect(stats.missedByPrayer.DHUHR).toBe(1);
    expect(stats.lifetimeMissed).toBe(2);
  });

  it('breakdown lists today’s passed-wakt untouched prayers as missed', () => {
    const now = new Date('2025-06-10T17:00:00+06:00');
    const todayKey = '2025-06-10';
    const times = makeTimes(todayKey);

    const records = [
      ...PRAYERS.map((p) => ({ date: new Date('2025-06-08T00:00:00Z'), prayer: p, completed: true })),
    ];

    const { missed } = getLifetimeMissedBreakdown(records, times, now);

    const todayMissed = missed.filter((m) => m.date === todayKey);
    expect(todayMissed.map((m) => m.prayer).sort()).toEqual(['DHUHR', 'FAJR']);
  });
});
