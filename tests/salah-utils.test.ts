import { describe, it, expect } from 'vitest';
import {
  formatDateKeyLocal,
  dateFromKey,
  rollingWeekStart,
  weekRangeFromStartKey,
  startOfWeek,
  addDays,
  computeStreak,
  countCompleted,
  isFardRecord,
} from '@/lib/salah-utils';

describe('salah-utils', () => {
  describe('formatDateKeyLocal', () => {
    it('formats date as YYYY-MM-DD', () => {
      const date = new Date(2025, 0, 15); // Jan 15, 2025
      expect(formatDateKeyLocal(date)).toBe('2025-01-15');
    });
  });

  describe('dateFromKey', () => {
    it('parses YYYY-MM-DD string to Date', () => {
      const date = dateFromKey('2025-01-15');
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(0); // January
      expect(date.getDate()).toBe(15);
    });
  });

  describe('rollingWeekStart', () => {
    it('returns a date within the last 7 days', () => {
      const now = new Date();
      const weekStart = rollingWeekStart(now);
      const diffMs = now.getTime() - weekStart.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeLessThanOrEqual(7);
    });
  });

  describe('weekRangeFromStartKey', () => {
    it('returns start and end dates 6 days apart', () => {
      const { start, end } = weekRangeFromStartKey('2025-01-13');
      const diffMs = end.getTime() - start.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(6);
    });
  });

  describe('isFardRecord', () => {
    it('returns true for FARD records', () => {
      expect(isFardRecord({ kind: 'FARD' })).toBe(true);
    });

    it('returns false for non-FARD records', () => {
      expect(isFardRecord({ kind: 'SUNNAH_BEFORE' })).toBe(false);
    });
  });

  describe('countCompleted', () => {
    it('counts completed prayers', () => {
      const records = [
        { date: new Date(), prayer: 'FAJR', completed: true },
        { date: new Date(), prayer: 'DHUHR', completed: false },
        { date: new Date(), prayer: 'ASR', completed: true },
      ];
      expect(countCompleted(records)).toBe(2);
    });
  });
});
