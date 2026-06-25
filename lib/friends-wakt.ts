import { PRAYER_LABELS, PRAYERS, type PrayerName } from './constants';
import {
  fetchPrayerTimes,
  formatClockTime,
  getNowMinutesInTimezone,
  getNowSecondsInTimezone,
  isForbiddenForPoke,
  prayerWaktWindow,
  zonedMinutesToDate,
  type PrayerTimesPayload,
} from './prayer-times';
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
  waktEndLabel: string | null;
  canPoke: boolean;
  pokeCooldownUntil?: string | null;
  pokeCooldownSeconds?: number;
  forbiddenNow: boolean;
  elapsedMinutes: number;
  remainingMinutes: number;
  elapsedSeconds: number;
  remainingSeconds: number;
};

type FardRecord = {
  prayer: string;
  completed: boolean;
  updatedAt: Date;
};

function classifyToday(
  prayer: PrayerName,
  completed: boolean,
  loggedAt: Date | null,
  times: PrayerTimesPayload,
  now: Date,
): FriendWaktRow['salahStatus'] {
  const { start, end } = prayerWaktWindow(prayer, times);
  const mins = getNowMinutesInTimezone(now, times.timeZone);
  const endsAt = zonedMinutesToDate(now, end, times.timeZone);

  if (!completed) {
    if (now < endsAt && mins >= start) return 'pending';
    if (now >= endsAt || mins >= end) return 'missed';
    return 'none';
  }

  if (!loggedAt) return 'kaza';

  const logMins = getNowMinutesInTimezone(loggedAt, times.timeZone);

  if (
    getDateKeyInTimezone(loggedAt, times.timeZone) === getDateKeyInTimezone(now, times.timeZone)
  ) {
    if (logMins >= start && logMins < end) return 'on-time';
    return 'kaza';
  }
  return 'kaza';
}

function getDateKeyInTimezone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);
}

function emptyRow(userId: string): FriendWaktRow {
  return {
    userId,
    prayer: null,
    prayerLabel: '—',
    phase: 'upcoming',
    salahStatus: 'none',
    waktStartedAt: null,
    waktEndsAt: null,
    waktEndLabel: null,
    canPoke: false,
    pokeCooldownUntil: null,
    pokeCooldownSeconds: 0,
    forbiddenNow: false,
    elapsedMinutes: 0,
    remainingMinutes: 0,
    elapsedSeconds: 0,
    remainingSeconds: 0,
  };
}

function buildTimingFields(
  start: number,
  end: number,
  now: Date,
  timeZone: string,
) {
  const startedAt = zonedMinutesToDate(now, start, timeZone);
  const endsAt = zonedMinutesToDate(now, end, timeZone);
  const nowSec = getNowSecondsInTimezone(now, timeZone);
  const startSec = start * 60;
  const endSec = end * 60;
  const elapsedSeconds = Math.max(0, nowSec - startSec);
  const remainingSeconds = Math.max(0, endSec - nowSec);

  return {
    startedAt,
    endsAt,
    elapsedSeconds,
    remainingSeconds,
    elapsedMinutes: Math.floor(elapsedSeconds / 60),
    remainingMinutes: Math.ceil(remainingSeconds / 60),
    waktEndLabel: formatClockTime(endsAt, true),
  };
}

export async function buildFriendWaktRow(
  userId: string,
  city: string | null | undefined,
  country: string | null | undefined,
  records: FardRecord[],
  now = new Date(),
): Promise<FriendWaktRow> {
  let times: PrayerTimesPayload;

  try {
    times = await fetchPrayerTimes(city?.trim() || 'Dhaka', country?.trim() || 'Bangladesh', now);
  } catch {
    return emptyRow(userId);
  }

  const tz = times.timeZone;
  const nowMins = getNowMinutesInTimezone(now, tz);
  const active = activePrayerForNow(times, now);

  if (!active) {
    const next = PRAYERS.find((p) => prayerWaktWindow(p, times).start > nowMins) ?? PRAYERS[0];
    const { start } = prayerWaktWindow(next, times);
    const startedAt = zonedMinutesToDate(now, start, tz);
    const untilStartSec = Math.max(0, start * 60 - getNowSecondsInTimezone(now, tz));

    return {
      userId,
      prayer: next,
      prayerLabel: PRAYER_LABELS[next],
      phase: 'upcoming',
      salahStatus: 'none',
      waktStartedAt: startedAt.toISOString(),
      waktEndsAt: null,
      waktEndLabel: formatClockTime(startedAt, true),
      canPoke: false,
      pokeCooldownUntil: null,
      pokeCooldownSeconds: 0,
      forbiddenNow: false,
      elapsedMinutes: 0,
      remainingMinutes: Math.ceil(untilStartSec / 60),
      elapsedSeconds: 0,
      remainingSeconds: untilStartSec,
    };
  }

  const rec = records.find((r) => r.prayer === active);
  const completed = rec?.completed ?? false;
  const loggedAt = completed && rec ? rec.updatedAt : null;
  const status = classifyToday(active, completed, loggedAt, times, now);
  const { start, end } = prayerWaktWindow(active, times);
  const timing = buildTimingFields(start, end, now, tz);
  const forbiddenNow = isForbiddenForPoke(times, nowMins, active);

  let phase: FriendWaktPhase = 'active';
  if (status === 'on-time') phase = 'prayed';
  else if (status === 'missed' || status === 'kaza') phase = 'passed';
  else if (now >= timing.endsAt) phase = 'passed';

  const canPoke = phase === 'active' && status === 'pending' && !forbiddenNow;

  return {
    userId,
    prayer: active,
    prayerLabel: PRAYER_LABELS[active],
    phase,
    salahStatus: status,
    waktStartedAt: timing.startedAt.toISOString(),
    waktEndsAt: timing.endsAt.toISOString(),
    waktEndLabel: timing.waktEndLabel,
    canPoke,
    forbiddenNow,
    elapsedMinutes: timing.elapsedMinutes,
    remainingMinutes: timing.remainingMinutes,
    elapsedSeconds: timing.elapsedSeconds,
    remainingSeconds: timing.remainingSeconds,
  };
}
