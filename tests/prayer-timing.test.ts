import { describe, it, expect } from 'vitest';
import {
  classifyPrayerForDay,
  classifySalahMark,
  isMarkWithinWakt,
} from '@/lib/prayer-insights-internal';
import type { PrayerTimesPayload } from '@/lib/prayer-times';

function mockTimes(): PrayerTimesPayload {
  return {
    city: 'Dhaka',
    country: 'Bangladesh',
    date: '2026-07-03',
    sunrise: '05:15',
    timeZone: 'Asia/Dhaka',
    fetchedAt: new Date().toISOString(),
    forbidden: [],
    prayers: [
      { prayer: 'FAJR', label: 'Fajr', time: '04:30', minutes: 270 },
      { prayer: 'DHUHR', label: 'Dhuhr', time: '12:15', minutes: 735 },
      { prayer: 'ASR', label: 'Asr', time: '15:45', minutes: 945 },
      { prayer: 'MAGHRIB', label: 'Maghrib', time: '18:45', minutes: 1125 },
      { prayer: 'ISHA', label: 'Isha', time: '20:00', minutes: 1200 },
    ],
  };
}

describe('kaza timing', () => {
  const prayerDate = new Date('2026-07-03T00:00:00.000Z');
  const times = mockTimes();

  it('counts a mark inside the wakt as on-time', () => {
    const markedAt = new Date('2026-07-03T05:00:00+06:00');
    const now = markedAt;
    expect(
      classifyPrayerForDay(prayerDate, 'FAJR', true, markedAt, times, now),
    ).toBe('on-time');
    expect(isMarkWithinWakt(markedAt, '2026-07-03', 'FAJR', times)).toBe(true);
    expect(classifySalahMark('2026-07-03', 'FAJR', markedAt, times)).toBe('on-time');
  });

  it('counts a first mark outside the wakt as kaza', () => {
    const markedAt = new Date('2026-07-03T21:00:00+06:00');
    const now = markedAt;
    expect(
      classifyPrayerForDay(prayerDate, 'FAJR', true, markedAt, times, now),
    ).toBe('kaza');
    expect(isMarkWithinWakt(markedAt, '2026-07-03', 'FAJR', times)).toBe(false);
    expect(classifySalahMark('2026-07-03', 'FAJR', markedAt, times)).toBe('kaza');
  });

  it('keeps on-time after uncheck/remark outside wakt when ever marked in wakt', () => {
    const remarkAt = new Date('2026-07-03T21:00:00+06:00');
    const now = remarkAt;
    expect(
      classifyPrayerForDay(prayerDate, 'FAJR', true, remarkAt, times, now, true),
    ).toBe('on-time');
    expect(classifySalahMark('2026-07-03', 'FAJR', remarkAt, times, true)).toBe('on-time');
  });

  it('counts a later-day makeup mark as kaza', () => {
    const markedAt = new Date('2026-07-04T10:00:00+06:00');
    const now = markedAt;
    expect(
      classifyPrayerForDay(prayerDate, 'FAJR', true, markedAt, times, now),
    ).toBe('kaza');
  });
});
