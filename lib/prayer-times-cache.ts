import type { PrayerTimesPayload } from './prayer-times';

type CacheEntry = {
  data: PrayerTimesPayload;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();
const MAX_ENTRIES = 400;

function normalizeLocation(value: string) {
  return value.trim().toLowerCase();
}

export function prayerTimesCacheKey(city: string, country: string, dateKey: string) {
  return `${normalizeLocation(city)}|${normalizeLocation(country)}|${dateKey}`;
}

function evictIfNeeded() {
  if (cache.size <= MAX_ENTRIES) return;
  const oldest = cache.keys().next().value;
  if (oldest) cache.delete(oldest);
}

/** Past/future dates are stable; today's times refresh more often. */
export function prayerTimesCacheTtlMs(onDate: Date) {
  const today = new Date();
  const sameCalendarDay =
    onDate.getFullYear() === today.getFullYear() &&
    onDate.getMonth() === today.getMonth() &&
    onDate.getDate() === today.getDate();
  return sameCalendarDay ? 30 * 60_000 : 24 * 60 * 60_000;
}

export function getCachedPrayerTimes(key: string): PrayerTimesPayload | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

export function setCachedPrayerTimes(key: string, data: PrayerTimesPayload, ttlMs: number) {
  evictIfNeeded();
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}
