import { PRAYER_LABELS, PRAYERS, type PrayerName } from './constants';
import {
  fetchPrayerTimes,
  timeToMinutes,
  type PrayerTimesPayload,
} from './prayer-times';
import { formatDateKey, startOfDay } from './salah-utils';
import { activePrayerForNow } from './rewards';

export type FriendWaktPhase = 'upcoming' | 'active' | 'passed' | 'prayed';

export type FriendWaktRow = {
  userId: string;
  prayer: PrayerName | null;
  prayerLabel: string;
  phase: FriendWaktPhase;
  salahStatus: 'pending' | 'on-time' | 'kaza' | 'missed' | 'none';
  waktStartedAt: string | null;
  waktEndsAt: string | null;
  canPoke: boolean;
  elapsedMinutes: number;
  remainingMinutes: number;
};

type FardRecord = {
  prayer: string;
  completed: boolean;
  updatedAt: Date;
};

function prayerWindow(prayer: PrayerName, times: PrayerTimesPayload) {
  const idx = PRAYERS.indexOf(prayer);
  const start = times.prayers[idx].minutes;

  if (prayer === 'FAJR') {
    return { start, end: timeToMinutes(times.sunrise) };
  }
  if (prayer === 'ISHA') {
    return { start, end: 24 * 60 };
  }
  return { start, end: times.prayers[idx + 1].minutes };
}

function windowStartDate(day: Date, startMinutes: number) {
  const d = new Date(day);
  d.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
  return d;
}

function windowEndDate(day: Date, endMinutes: number) {
  const d = new Date(day);
  d.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);
  return d;
}

function classifyToday(
  prayer: PrayerName,
  completed: boolean,
  loggedAt: Date | null,
  times: PrayerTimesPayload,
  now: Date,
): FriendWaktRow['salahStatus'] {
  const today = startOfDay(now);
  const { start, end } = prayerWindow(prayer, times);
  const waktEnd = windowEndDate(today, end);
  const mins = now.getHours() * 60 + now.getMinutes();

  if (!completed) {
    if (now < waktEnd && mins >= start) return 'pending';
    if (now >= waktEnd || mins >= end) return 'missed';
    return 'none';
  }

  if (!loggedAt) return 'kaza';

  const logMins = loggedAt.getHours() * 60 + loggedAt.getMinutes();
  if (formatDateKey(loggedAt) === formatDateKey(today)) {
    if (logMins >= start && logMins < end) return 'on-time';
    return 'kaza';
  }
  return 'kaza';
}

export async function buildFriendWaktRow(
  userId: string,
  city: string | null | undefined,
  country: string | null | undefined,
  records: FardRecord[],
  now = new Date(),
): Promise<FriendWaktRow> {
  const today = startOfDay(now);
  let times: PrayerTimesPayload;

  try {
    times = await fetchPrayerTimes(city?.trim() || 'Dhaka', country?.trim() || 'Bangladesh', today);
  } catch {
    return {
      userId,
      prayer: null,
      prayerLabel: '—',
      phase: 'upcoming',
      salahStatus: 'none',
      waktStartedAt: null,
      waktEndsAt: null,
      canPoke: false,
      elapsedMinutes: 0,
      remainingMinutes: 0,
    };
  }

  const active = activePrayerForNow(times, now);
  if (!active) {
    const mins = now.getHours() * 60 + now.getMinutes();
    const next = PRAYERS.find((p) => prayerWindow(p, times).start > mins) ?? PRAYERS[0];
    const { start } = prayerWindow(next, times);
    const startedAt = windowStartDate(today, start);

    return {
      userId,
      prayer: next,
      prayerLabel: PRAYER_LABELS[next],
      phase: 'upcoming',
      salahStatus: 'none',
      waktStartedAt: startedAt.toISOString(),
      waktEndsAt: null,
      canPoke: false,
      elapsedMinutes: 0,
      remainingMinutes: Math.max(0, start - mins),
    };
  }

  const rec = records.find((r) => r.prayer === active);
  const completed = rec?.completed ?? false;
  const loggedAt = completed && rec ? rec.updatedAt : null;
  const status = classifyToday(active, completed, loggedAt, times, now);
  const { start, end } = prayerWindow(active, times);
  const startedAt = windowStartDate(today, start);
  const endsAt = windowEndDate(today, end);
  const mins = now.getHours() * 60 + now.getMinutes();
  const elapsed = Math.max(0, mins - start);
  const remaining = Math.max(0, end - mins);

  let phase: FriendWaktPhase = 'active';
  if (status === 'on-time') phase = 'prayed';
  else if (status === 'missed' || status === 'kaza') phase = 'passed';
  else if (now >= endsAt) phase = 'passed';

  return {
    userId,
    prayer: active,
    prayerLabel: PRAYER_LABELS[active],
    phase,
    salahStatus: status,
    waktStartedAt: startedAt.toISOString(),
    waktEndsAt: endsAt.toISOString(),
    canPoke: phase === 'active' && status === 'pending',
    elapsedMinutes: elapsed,
    remainingMinutes: remaining,
  };
}
