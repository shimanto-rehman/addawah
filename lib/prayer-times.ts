import { PRAYERS, PRAYER_LABELS, type PrayerName } from './constants';
import {
  getCachedPrayerTimes,
  prayerTimesCacheKey,
  prayerTimesCacheTtlMs,
  prayerTimesCoordsCacheKey,
  setCachedPrayerTimes,
} from './prayer-times-cache';
import { kvGetJson, kvSetJson } from './kv';

/**
 * Canonical prayer-time lookup location. Coords are preferred (more accurate);
 * the named form is the legacy fallback for accounts without migrated coords.
 * The owning module for `fetchPrayerTimes` is the natural home for this type.
 */
export type PrayerLocation =
  | { kind: 'coords'; latitude: number; longitude: number }
  | { kind: 'named'; city: string; country: string };

/** Helper: call fetchPrayerTimes with a PrayerLocation. */
export async function fetchPrayerTimesFor(
  loc: PrayerLocation,
  onDate = new Date(),
): Promise<PrayerTimesPayload> {
  return loc.kind === 'coords'
    ? fetchPrayerTimes(loc.latitude, loc.longitude, onDate)
    : fetchPrayerTimes(loc.city, loc.country, onDate);
}

/**
 * Build a PrayerLocation from a user row, preferring stored coords.
 * Returns null when neither coords nor a complete city/country pair is set,
 * so callers can fail closed instead of silently defaulting to Dhaka.
 */
export function prayerLocationFromUser(user: {
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  country?: string | null;
}): PrayerLocation | null {
  if (typeof user.latitude === 'number' && typeof user.longitude === 'number') {
    return { kind: 'coords', latitude: user.latitude, longitude: user.longitude };
  }
  const city = user.city?.trim();
  const country = user.country?.trim();
  return city && country ? { kind: 'named', city, country } : null;
}

export type PrayerSlot = {
  prayer: PrayerName;
  label: string;
  time: string;
  minutes: number;
};

export type ForbiddenWindow = {
  id: 'after-fajr' | 'zawal' | 'after-asr';
  label: string;
  labelAr: string;
  start: string;
  end: string;
};

export type PrayerTimesPayload = {
  city: string;
  country: string;
  date: string;
  prayers: PrayerSlot[];
  forbidden: ForbiddenWindow[];
  sunrise: string;
  timeZone: string;
  fetchedAt: string;
};

export function isPrayerTimesPayload(value: unknown): value is PrayerTimesPayload {
  if (!value || typeof value !== 'object') return false;
  const v = value as PrayerTimesPayload;
  return (
    Array.isArray(v.prayers) &&
    v.prayers.length >= PRAYERS.length &&
    v.prayers.every(
      (p) =>
        typeof p === 'object' &&
        p !== null &&
        typeof p.minutes === 'number' &&
        typeof p.time === 'string',
    ) &&
    Array.isArray(v.forbidden) &&
    typeof v.timeZone === 'string' &&
    typeof v.sunrise === 'string'
  );
}

/** Rejects error JSON and malformed cache payloads from SWR. */
export async function prayerTimesFetcher(url: string): Promise<PrayerTimesPayload> {
  const res = await fetch(url);
  const json: unknown = await res.json();
  if (!res.ok || !isPrayerTimesPayload(json)) {
    throw new Error('Could not load prayer times');
  }
  return json;
}

const API_PRAYER: Record<PrayerName, string> = {
  FAJR: 'Fajr',
  DHUHR: 'Dhuhr',
  ASR: 'Asr',
  MAGHRIB: 'Maghrib',
  ISHA: 'Isha',
};

export function timeToMinutes(time: string) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatClockTime(date: Date, withSeconds = false) {
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: withSeconds ? '2-digit' : undefined,
    hour12: true,
  });
}

export function formatCountdownHms(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export function getDatePartsInTimezone(date: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const hour = get('hour');

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: hour === 24 ? 0 : hour,
    minute: get('minute'),
    second: get('second'),
  };
}

export function formatDateKeyInTimezone(date: Date, timeZone: string) {
  const p = getDatePartsInTimezone(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

export function getNowMinutesInTimezone(date: Date, timeZone: string) {
  const p = getDatePartsInTimezone(date, timeZone);
  return p.hour * 60 + p.minute;
}

export function getNowSecondsInTimezone(date: Date, timeZone: string) {
  const p = getDatePartsInTimezone(date, timeZone);
  return p.hour * 3600 + p.minute * 60 + p.second;
}

/** Convert a local wall-clock time (minutes from midnight) on anchor's calendar day to UTC Date. */
export function zonedMinutesToDate(anchor: Date, minutesFromMidnight: number, timeZone: string): Date {
  const { year, month, day } = getDatePartsInTimezone(anchor, timeZone);
  const hours = Math.floor(minutesFromMidnight / 60) % 24;
  const mins = minutesFromMidnight % 60;

  let candidate = new Date(Date.UTC(year, month - 1, day, hours, mins, 0));

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const local = getDatePartsInTimezone(candidate, timeZone);
    const desired = hours * 3600 + mins * 60;
    const actual = local.hour * 3600 + local.minute * 60 + local.second;
    const dayDiff =
      Date.UTC(year, month - 1, day) - Date.UTC(local.year, local.month - 1, local.day);
    const deltaSec = desired - actual + Math.round(dayDiff / 86_400_000) * 86_400;
    if (Math.abs(deltaSec) < 2) break;
    candidate = new Date(candidate.getTime() + deltaSec * 1000);
  }

  return candidate;
}

/** Wakt window for a fard prayer — Fajr until sunrise; others until the next fard. */
export function prayerWaktWindow(prayer: PrayerName, times: PrayerTimesPayload) {
  if (!isPrayerTimesPayload(times)) {
    return { start: 0, end: 24 * 60 };
  }
  const idx = PRAYERS.indexOf(prayer);
  const start = times.prayers[idx]?.minutes ?? 0;

  if (prayer === 'FAJR') {
    return { start, end: timeToMinutes(times.sunrise) };
  }
  if (prayer === 'ISHA') {
    return { start, end: 24 * 60 };
  }
  return { start, end: times.prayers[idx + 1]?.minutes ?? 24 * 60 };
}

/** Karahah windows where poking for the active fard is not allowed. */
export function isForbiddenForPoke(
  times: PrayerTimesPayload,
  nowMinutes: number,
  prayer: PrayerName,
) {
  for (const w of times.forbidden) {
    if (!isTimeInWindow(nowMinutes, w.start, w.end)) continue;
    if (w.id === 'zawal') return true;
    if (w.id === 'after-fajr' && prayer !== 'FAJR') return true;
    if (w.id === 'after-asr' && prayer !== 'ASR') return true;
  }
  return false;
}

export function formatPrayerTime(time: string) {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function isTimeInWindow(nowMinutes: number, start: string, end: string) {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  if (s <= e) return nowMinutes >= s && nowMinutes < e;
  return nowMinutes >= s || nowMinutes < e;
}

export function getCurrentPrayerIndex(prayers: PrayerSlot[], nowMinutes: number) {
  for (let i = prayers.length - 1; i >= 0; i -= 1) {
    if (nowMinutes >= prayers[i].minutes) return i;
  }
  return -1;
}

export function getNextPrayerIndex(prayers: PrayerSlot[], nowMinutes: number) {
  for (let i = 0; i < prayers.length; i += 1) {
    if (nowMinutes < prayers[i].minutes) return i;
  }
  return 0;
}

export function buildForbiddenWindows(timings: Record<string, string>): ForbiddenWindow[] {
  const fajr = timings.Fajr;
  const sunrise = timings.Sunrise;
  const dhuhr = timings.Dhuhr;
  const asr = timings.Asr;
  const maghrib = timings.Maghrib;
  const zawalStart = minutesToTime(timeToMinutes(dhuhr) - 10);

  return [
    {
      id: 'after-fajr',
      label: 'After Fajr until sunrise',
      labelAr: 'بعد الفجر حتى الشروق',
      start: fajr,
      end: sunrise,
    },
    {
      id: 'zawal',
      label: 'At zenith (Zawāl)',
      labelAr: 'عند الزوال',
      start: zawalStart,
      end: dhuhr,
    },
    {
      id: 'after-asr',
      label: 'After Asr until Maghrib',
      labelAr: 'بعد العصر حتى المغرب',
      start: asr,
      end: maghrib,
    },
  ];
}

export function buildPrayerSlots(timings: Record<string, string>): PrayerSlot[] {
  return PRAYERS.map((prayer) => {
    const time = timings[API_PRAYER[prayer]];
    return {
      prayer,
      label: PRAYER_LABELS[prayer],
      time,
      minutes: timeToMinutes(time),
    };
  });
}

function prayerDateParam(onDate: Date) {
  return `${onDate.getDate()}-${onDate.getMonth() + 1}-${onDate.getFullYear()}`;
}

export async function fetchPrayerTimes(
  cityOrLat: string | number,
  countryOrLng: string | number,
  onDate = new Date(),
): Promise<PrayerTimesPayload> {
  const dateParam = prayerDateParam(onDate);
  const useCoords = typeof cityOrLat === 'number' && typeof countryOrLng === 'number';

  const cacheKey = useCoords
    ? prayerTimesCoordsCacheKey(cityOrLat as number, countryOrLng as number, dateParam)
    : prayerTimesCacheKey(cityOrLat as string, countryOrLng as string, dateParam);
  const cached = getCachedPrayerTimes(cacheKey);
  if (cached && isPrayerTimesPayload(cached)) return cached;

  const kvKey = `prayer:${cacheKey}`;
  const fromKv = await kvGetJson<unknown>(kvKey);
  if (fromKv && isPrayerTimesPayload(fromKv)) {
    setCachedPrayerTimes(cacheKey, fromKv, prayerTimesCacheTtlMs(onDate));
    return fromKv;
  }

  const url = new URL(
    useCoords
      ? 'https://api.aladhan.com/v1/timings'
      : 'https://api.aladhan.com/v1/timingsByCity',
  );
  url.searchParams.set('method', '1');
  url.searchParams.set('school', '1');
  url.searchParams.set('date', dateParam);
  if (useCoords) {
    url.searchParams.set('latitude', String(cityOrLat));
    url.searchParams.set('longitude', String(countryOrLng));
  } else {
    // Legacy path — city/country name lookup. Kept for the ruhaniah recompute
    // job until it migrates to coords; Aladhan deprecates this endpoint slowly.
    url.searchParams.set('city', cityOrLat as string);
    url.searchParams.set('country', countryOrLng as string);
  }

  const res = await fetch(url.toString(), { next: { revalidate: 1800 } });
  if (!res.ok) throw new Error('Prayer times unavailable');

  const json = await res.json();
  const timings = json?.data?.timings as Record<string, string> | undefined;
  if (!timings?.Fajr) throw new Error('Invalid prayer times response');

  const prayers = buildPrayerSlots(timings);
  const timeZone =
    (json?.data?.meta?.timezone as string | undefined)?.trim() || 'UTC';

  const payload: PrayerTimesPayload = {
    city: useCoords ? '' : (cityOrLat as string),
    country: useCoords ? '' : (countryOrLng as string),
    date: json?.data?.date?.readable ?? dateParam,
    prayers,
    forbidden: buildForbiddenWindows(timings),
    sunrise: timings.Sunrise,
    timeZone,
    fetchedAt: new Date().toISOString(),
  };

  setCachedPrayerTimes(cacheKey, payload, prayerTimesCacheTtlMs(onDate));
  const ttlSec = Math.max(60, Math.floor(prayerTimesCacheTtlMs(onDate) / 1000));
  void kvSetJson(kvKey, payload, ttlSec);
  return payload;
}
