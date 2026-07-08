import { PrayerName, PRAYERS, PRAYER_LABELS, SUNNAH_SLOTS } from './constants';
import {
  formatDateKeyInTimezone,
  getNowMinutesInTimezone,
  prayerWaktWindow,
  zonedMinutesToDate,
  type PrayerTimesPayload,
} from './prayer-times';

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

/** Seven-day window ending on `d` (today in the last column). */
export function rollingWeekStart(d: Date) {
  return addDays(startOfDay(d), -6);
}

export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function formatDateKey(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Calendar date in the user's local timezone (UI columns, week param). */
export function formatDateKeyLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse YYYY-MM-DD to a UTC date-only value for @db.Date fields. */
export function dateFromKey(key: string) {
  const [y, m, day] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

export function addDaysToKey(key: string, days: number) {
  const d = dateFromKey(key);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDateKey(d);
}

/** Calendar date key for a stored @db.Date value (always UTC date parts). */
export function dateKeyFromDbDate(d: Date) {
  return formatDateKey(d);
}

/** Rolling 7-day window start key in the user's prayer timezone. */
export function rollingWeekStartKey(timeZone: string, now = new Date()) {
  const todayKey = formatDateKeyInTimezone(now, timeZone);
  return addDaysToKey(todayKey, -6);
}

export function weekDayKeys(weekStartKey: string) {
  return Array.from({ length: 7 }, (_, i) => addDaysToKey(weekStartKey, i));
}

export function dayNumberFromKey(key: string) {
  return Number(key.split('-')[2]);
}

export function weekdayShortFromKey(key: string) {
  return dateFromKey(key).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
}

export function formatWeekLabelFromKeys(weekStartKey: string) {
  const endKey = addDaysToKey(weekStartKey, 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: 'UTC' };
  const start = dateFromKey(weekStartKey).toLocaleDateString('en-US', opts);
  const end = dateFromKey(endKey).toLocaleDateString('en-US', { ...opts, year: 'numeric' });
  return `${start} – ${end}`;
}

/** Inclusive Mon–Sun range for Prisma DATE queries (fixes Sunday dropping off). */
export function weekRangeFromStartKey(weekStartKey: string) {
  return {
    start: dateFromKey(weekStartKey),
    end: dateFromKey(addDaysToKey(weekStartKey, 6)),
  };
}

export function getWeekDays(weekStart: Date) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function formatWeekLabel(weekStart: Date) {
  const end = addDays(weekStart, 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const y = weekStart.getFullYear() !== end.getFullYear();
  return `${weekStart.toLocaleDateString('en-US', { ...opts, year: y ? 'numeric' : undefined })} – ${end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
}

export type SalahCell = {
  fard: boolean;
  inJamat: boolean;
  sunnahBefore: boolean[];
  sunnahAfter: boolean[];
};

export type SalahGrid = Record<string, Partial<Record<PrayerName, SalahCell>>>;

export function emptySalahCell(prayer: PrayerName): SalahCell {
  const slots = SUNNAH_SLOTS[prayer];
  return {
    fard: false,
    inJamat: false,
    sunnahBefore: Array.from({ length: slots.before }, () => false),
    sunnahAfter: Array.from({ length: slots.after }, () => false),
  };
}

export function getSalahCell(
  grid: SalahGrid,
  dateKey: string,
  prayer: PrayerName,
): SalahCell {
  return grid[dateKey]?.[prayer] ?? emptySalahCell(prayer);
}

export function isFardRecord(record: { kind?: string }) {
  return !record.kind || record.kind === 'FARD';
}
export function buildSalahGrid(
  records: { date: Date; prayer: string; kind?: string; unit?: number; completed: boolean; inJamat?: boolean }[],
): SalahGrid {
  const grid: SalahGrid = {};
  for (const r of records) {
    const key = dateKeyFromDbDate(r.date);
    const prayer = r.prayer as PrayerName;
    if (!PRAYERS.includes(prayer)) continue;

    if (!grid[key]) grid[key] = {};
    if (!grid[key][prayer]) grid[key][prayer] = emptySalahCell(prayer);

    const cell = grid[key][prayer]!;
    const unit = r.unit ?? 0;

    if (isFardRecord(r)) {
      cell.fard = r.completed;
      if (typeof r.inJamat === 'boolean') cell.inJamat = r.inJamat;
    } else if (r.kind === 'SUNNAH_BEFORE' && unit < cell.sunnahBefore.length) {
      cell.sunnahBefore[unit] = r.completed;
    } else if (r.kind === 'SUNNAH_AFTER' && unit < cell.sunnahAfter.length) {
      cell.sunnahAfter[unit] = r.completed;
    }
  }
  return grid;
}

export function countCompleted(records: { completed: boolean }[]) {
  return records.filter((r) => r.completed).length;
}

export function computeStreak(records: { date: Date; completed: boolean; kind?: string }[]) {
  const fardRecords = records.filter(isFardRecord);
  const byDay = new Map<string, number>();
  for (const r of fardRecords) {
    if (!r.completed) continue;
    const key = formatDateKey(r.date);
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }

  let streak = 0;
  const today = startOfDay(new Date());
  for (let i = 0; i < 365; i++) {
    const key = formatDateKey(addDays(today, -i));
    const done = byDay.get(key) ?? 0;
    if (done < 3) {
      if (i === 0) continue; // today may not be complete yet
      break;
    }
    streak += 1;
  }
  return streak;
}

export function computeLifetimeStats(records: { completed: boolean; prayer: string; kind?: string }[]) {
  const fardRecords = records.filter(isFardRecord);
  const total = fardRecords.length;
  const completed = countCompleted(fardRecords);
  const byPrayer = PRAYERS.map((p) => {
    const subset = fardRecords.filter((r) => r.prayer === p);
    const done = countCompleted(subset);
    return {
      prayer: p,
      completed: done,
      total: subset.length,
      rate: subset.length ? Math.round((done / subset.length) * 100) : 0,
    };
  });
  return {
    total,
    completed,
    rate: total ? Math.round((completed / total) * 100) : 0,
    byPrayer,
  };
}

export function computeLifetimeSinceJoin(
  _joinedAt: Date,
  records: { date: Date; prayer: string; completed: boolean; kind?: string; inJamat?: boolean }[],
  prayerTimes?: PrayerTimesPayload | null,
  now = new Date(),
) {
  if (prayerTimes) {
    return computeLifetimeTracking(records, prayerTimes, now);
  }
  return computeLifetimeTrackingLegacy(records, now);
}

export type MissedWaktSlot = {
  date: string;
  prayer: PrayerName;
  label: string;
};

export function getLifetimeMissedBreakdown(
  records: { date: Date; prayer: string; completed: boolean; kind?: string }[],
  prayerTimes: PrayerTimesPayload,
  now = new Date(),
  /** When provided, only generate detailed slots for these prayers (optimization). */
  missedByPrayer?: Record<PrayerName, number>,
): { missed: MissedWaktSlot[]; trackingSince: string | null } {
  const fardRecords = records.filter(isFardRecord);
  const todayKey = formatDateKeyInTimezone(now, prayerTimes.timeZone);
  const recordMap = new Map<string, boolean>();
  let firstTrackingKey: string | null = null;

  for (const r of fardRecords) {
    const key = dateKeyFromDbDate(r.date);
    recordMap.set(`${key}:${r.prayer}`, r.completed);
    if (r.completed && (!firstTrackingKey || key < firstTrackingKey)) {
      firstTrackingKey = key;
    }
  }

  if (!firstTrackingKey) return { missed: [], trackingSince: null };

  // Only iterate prayers that have missed instances (O(missed) instead of O(days×5))
  const prayersToScan = missedByPrayer
    ? PRAYERS.filter((p) => (missedByPrayer[p] ?? 0) > 0)
    : PRAYERS;

  const missed: MissedWaktSlot[] = [];

  for (let key = firstTrackingKey; key <= todayKey; key = addDaysToKey(key, 1)) {
    for (const prayer of prayersToScan) {
      const logged = recordMap.get(`${key}:${prayer}`);
      const isToday = key === todayKey;

      if (isToday) {
        if (isSlotStillPending(key, prayer, prayerTimes, now)) continue;
        if (logged === true) continue;
        // Wakt passed and not completed → missed (covers both `false` and
        // `undefined` — untouched prayers have no row).
        missed.push({ date: key, prayer, label: PRAYER_LABELS[prayer] });
        continue;
      }

      if (logged === true) continue;

      missed.push({
        date: key,
        prayer,
        label: PRAYER_LABELS[prayer],
      });
    }
  }

  return { missed, trackingSince: firstTrackingKey };
}

/** Wakt-aware lifetime stats from the first day the user logged a fard prayer. */
export function computeLifetimeTracking(
  records: { date: Date; prayer: string; completed: boolean; kind?: string; inJamat?: boolean }[],
  prayerTimes: PrayerTimesPayload,
  now = new Date(),
) {
  const fardRecords = records.filter(isFardRecord);
  const todayKey = formatDateKeyInTimezone(now, prayerTimes.timeZone);

  const recordMap = new Map<string, boolean>();
  const jamatMap = new Map<string, boolean>();
  let firstTrackingKey: string | null = null;

  for (const r of fardRecords) {
    const key = dateKeyFromDbDate(r.date);
    recordMap.set(`${key}:${r.prayer}`, r.completed);
    if (r.inJamat) jamatMap.set(`${key}:${r.prayer}`, true);
    if (r.completed && (!firstTrackingKey || key < firstTrackingKey)) {
      firstTrackingKey = key;
    }
  }

  if (!firstTrackingKey) {
    return emptyLifetimeTracking();
  }

  let expected = 0;
  let prayed = 0;
  let jamatCount = 0;
  let activeDays = 0;
  let perfectDays = 0;
  const missedByPrayer = Object.fromEntries(PRAYERS.map((p) => [p, 0])) as Record<PrayerName, number>;

  for (let key = firstTrackingKey; key <= todayKey; key = addDaysToKey(key, 1)) {
    let dayDone = 0;
    let dayAccountable = 0;

    for (const prayer of PRAYERS) {
      const logged = recordMap.get(`${key}:${prayer}`);
      const isToday = key === todayKey;

      if (isToday) {
        if (isSlotStillPending(key, prayer, prayerTimes, now)) continue;
        if (logged === true) {
          expected += 1;
          prayed += 1;
          if (jamatMap.get(`${key}:${prayer}`)) jamatCount += 1;
          dayDone += 1;
          dayAccountable += 1;
        } else {
          expected += 1;
          dayAccountable += 1;
          missedByPrayer[prayer] += 1;
        }
        continue;
      }

      if (logged === true) {
        expected += 1;
        prayed += 1;
        if (jamatMap.get(`${key}:${prayer}`)) jamatCount += 1;
        dayDone += 1;
        dayAccountable += 1;
        continue;
      }

      expected += 1;
      dayAccountable += 1;
      missedByPrayer[prayer] += 1;
    }

    if (dayDone > 0) activeDays += 1;
    if (dayAccountable > 0 && dayDone === dayAccountable) perfectDays += 1;
  }

  const daysOnApp = Math.max(
    1,
    Math.floor(
      (dateFromKey(todayKey).getTime() - dateFromKey(firstTrackingKey).getTime()) / 86_400_000,
    ) + 1,
  );

  const byPrayer = PRAYERS.map((prayer) => {
    const subset = fardRecords.filter((r) => r.prayer === prayer);
    const done = countCompleted(subset);
    return {
      prayer,
      completed: done,
      total: subset.length,
      rate: subset.length ? Math.round((done / subset.length) * 100) : 0,
    };
  });
  const bestPrayer = byPrayer.reduce(
    (best, cur) => (cur.total > 0 && cur.rate > (best?.rate ?? -1) ? cur : best),
    null as (typeof byPrayer)[number] | null,
  );

  return {
    lifetimePrayed: prayed,
    lifetimeMissed: Math.max(0, expected - prayed),
    lifetimeExpected: expected,
    lifetimeRate: expected ? Math.round((prayed / expected) * 100) : 0,
    lifetimeJamat: jamatCount,
    activeDays,
    perfectDays,
    daysOnApp,
    missedByPrayer,
    bestPrayer,
    firstTrackingKey,
    byPrayer,
  };
}

function isSlotStillPending(
  dayKey: string,
  prayer: PrayerName,
  times: PrayerTimesPayload,
  now: Date,
): boolean {
  const todayKey = formatDateKeyInTimezone(now, times.timeZone);
  if (dayKey !== todayKey) return false;

  const { start, end } = prayerWaktWindow(prayer, times);
  const nowMins = getNowMinutesInTimezone(now, times.timeZone);

  if (nowMins < start) return true;

  const waktEnd = zonedMinutesToDate(now, end, times.timeZone);
  return now < waktEnd;
}

function emptyLifetimeTracking() {
  const missedByPrayer = Object.fromEntries(PRAYERS.map((p) => [p, 0])) as Record<PrayerName, number>;
  return {
    lifetimePrayed: 0,
    lifetimeMissed: 0,
    lifetimeExpected: 0,
    lifetimeRate: 0,
    lifetimeJamat: 0,
    activeDays: 0,
    perfectDays: 0,
    daysOnApp: 0,
    missedByPrayer,
    bestPrayer: null as {
      prayer: PrayerName;
      completed: number;
      total: number;
      rate: number;
    } | null,
    firstTrackingKey: null as string | null,
    byPrayer: [] as {
      prayer: string;
      completed: number;
      total: number;
      rate: number;
    }[],
  };
}

/** Legacy path when prayer times are unavailable (no pending exclusion). */
function computeLifetimeTrackingLegacy(
  records: { date: Date; prayer: string; completed: boolean; kind?: string }[],
  now = new Date(),
) {
  const fardRecords = records.filter(isFardRecord);
  const todayKey = formatDateKeyLocal(now);

  const recordMap = new Map<string, boolean>();
  let firstTrackingKey: string | null = null;

  for (const r of fardRecords) {
    const key = formatDateKey(r.date);
    recordMap.set(`${key}:${r.prayer}`, r.completed);
    if (r.completed && (!firstTrackingKey || key < firstTrackingKey)) {
      firstTrackingKey = key;
    }
  }

  if (!firstTrackingKey) return emptyLifetimeTracking();

  let expected = 0;
  let prayed = 0;
  let activeDays = 0;
  let perfectDays = 0;
  const missedByPrayer = Object.fromEntries(PRAYERS.map((p) => [p, 0])) as Record<PrayerName, number>;

  for (let key = firstTrackingKey; key <= todayKey; key = addDaysToKey(key, 1)) {
    let dayDone = 0;
    let dayAccountable = 0;

    for (const prayer of PRAYERS) {
      const logged = recordMap.get(`${key}:${prayer}`);
      expected += 1;
      dayAccountable += 1;
      if (logged === true) {
        prayed += 1;
        dayDone += 1;
      } else {
        missedByPrayer[prayer] += 1;
      }
    }

    if (dayDone > 0) activeDays += 1;
    if (dayAccountable > 0 && dayDone === dayAccountable) perfectDays += 1;
  }

  const daysOnApp = Math.max(
    1,
    Math.floor(
      (dateFromKey(todayKey).getTime() - dateFromKey(firstTrackingKey).getTime()) / 86_400_000,
    ) + 1,
  );

  const byPrayer = PRAYERS.map((prayer) => {
    const subset = fardRecords.filter((r) => r.prayer === prayer);
    const done = countCompleted(subset);
    return {
      prayer,
      completed: done,
      total: subset.length,
      rate: subset.length ? Math.round((done / subset.length) * 100) : 0,
    };
  });
  const bestPrayer = byPrayer.reduce(
    (best, cur) => (cur.total > 0 && cur.rate > (best?.rate ?? -1) ? cur : best),
    null as (typeof byPrayer)[number] | null,
  );

  return {
    lifetimePrayed: prayed,
    lifetimeMissed: Math.max(0, expected - prayed),
    lifetimeExpected: expected,
    lifetimeRate: expected ? Math.round((prayed / expected) * 100) : 0,
    lifetimeJamat: 0, // legacy path — prayer times unavailable, jamat not tracked
    activeDays,
    perfectDays,
    daysOnApp,
    missedByPrayer,
    bestPrayer,
    firstTrackingKey,
    byPrayer,
  };
}

export function toHijri(date = new Date()) {
  try {
    const fmt = new Intl.DateTimeFormat('en-u-ca-islamic', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const parts = fmt.formatToParts(date);
    const day = parts.find((p) => p.type === 'day')?.value ?? '';
    const month = parts.find((p) => p.type === 'month')?.value ?? '';
    const year = parts.find((p) => p.type === 'year')?.value ?? '';
    return { day, month, year, formatted: `${day} ${month} ${year} AH` };
  } catch {
    return { day: '', month: '', year: '', formatted: 'Hijri calendar' };
  }
}

export function getGregorianLabel(date = new Date()) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function getIslamicGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Assalamu Alaikum';
  if (hour < 17) return 'Assalamu Alaikum';
  return 'Assalamu Alaikum';
}
