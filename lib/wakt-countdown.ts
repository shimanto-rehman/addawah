import { PRAYER_LABELS, PRAYERS, type PrayerName } from './constants';
import {
  getNowMinutesInTimezone,
  prayerWaktWindow,
  zonedMinutesToDate,
  type PrayerTimesPayload,
} from './prayer-times';
import { activePrayerForNow } from './rewards';

export type WaktCountdownState = {
  prayer: PrayerName;
  prayerLabel: string;
  remainingSeconds: number;
  mode: 'active' | 'upcoming';
  timeZone: string;
};

function getNextWaktStart(now: Date, times: PrayerTimesPayload): { prayer: PrayerName; startsAt: Date } {
  const tz = times.timeZone;
  const nowMins = getNowMinutesInTimezone(now, tz);

  for (const prayer of PRAYERS) {
    const { start } = prayerWaktWindow(prayer, times);
    if (start > nowMins) {
      return { prayer, startsAt: zonedMinutesToDate(now, start, tz) };
    }
  }

  const { start } = prayerWaktWindow('FAJR', times);
  const tomorrow = new Date(now.getTime() + 86_400_000);
  return { prayer: 'FAJR', startsAt: zonedMinutesToDate(tomorrow, start, tz) };
}

function getWaktEnd(now: Date, times: PrayerTimesPayload, prayer: PrayerName): Date {
  const { end } = prayerWaktWindow(prayer, times);
  const tz = times.timeZone;
  const endsAt = zonedMinutesToDate(now, end, tz);

  if (endsAt.getTime() <= now.getTime() && end >= 24 * 60) {
    const nextDay = new Date(now.getTime() + 86_400_000);
    return zonedMinutesToDate(nextDay, end % (24 * 60), tz);
  }

  return endsAt;
}

export function getWaktCountdownState(
  times: PrayerTimesPayload,
  now = new Date(),
): WaktCountdownState {
  const tz = times.timeZone;
  const active = activePrayerForNow(times, now);

  if (active) {
    const endsAt = getWaktEnd(now, times, active);
    return {
      prayer: active,
      prayerLabel: PRAYER_LABELS[active],
      remainingSeconds: Math.max(0, Math.floor((endsAt.getTime() - now.getTime()) / 1000)),
      mode: 'active',
      timeZone: tz,
    };
  }

  const { prayer, startsAt } = getNextWaktStart(now, times);
  return {
    prayer,
    prayerLabel: PRAYER_LABELS[prayer],
    remainingSeconds: Math.max(0, Math.floor((startsAt.getTime() - now.getTime()) / 1000)),
    mode: 'upcoming',
    timeZone: tz,
  };
}

export function formatWaktDate(now: Date, timeZone: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(now);
}
