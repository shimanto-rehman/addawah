import { PRAYERS, PRAYER_LABELS, type PrayerName } from './constants';

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
  fetchedAt: string;
};

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

export async function fetchPrayerTimes(city: string, country: string, onDate = new Date()): Promise<PrayerTimesPayload> {
  const dateParam = `${onDate.getDate()}-${onDate.getMonth() + 1}-${onDate.getFullYear()}`;

  const url = new URL('https://api.aladhan.com/v1/timingsByCity');
  url.searchParams.set('city', city);
  url.searchParams.set('country', country);
  url.searchParams.set('method', '1');
  url.searchParams.set('school', '1');
  url.searchParams.set('date', dateParam);

  const res = await fetch(url.toString(), { next: { revalidate: 1800 } });
  if (!res.ok) throw new Error('Prayer times unavailable');

  const json = await res.json();
  const timings = json?.data?.timings as Record<string, string> | undefined;
  if (!timings?.Fajr) throw new Error('Invalid prayer times response');

  const prayers = buildPrayerSlots(timings);

  return {
    city,
    country,
    date: json?.data?.date?.readable ?? dateParam,
    prayers,
    forbidden: buildForbiddenWindows(timings),
    sunrise: timings.Sunrise,
    fetchedAt: new Date().toISOString(),
  };
}
