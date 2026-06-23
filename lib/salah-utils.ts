import { PrayerName, PRAYERS, SUNNAH_SLOTS } from './constants';

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
  sunnahBefore: boolean[];
  sunnahAfter: boolean[];
};

export type SalahGrid = Record<string, Partial<Record<PrayerName, SalahCell>>>;

export function emptySalahCell(prayer: PrayerName): SalahCell {
  const slots = SUNNAH_SLOTS[prayer];
  return {
    fard: false,
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
  records: { date: Date; prayer: string; kind?: string; unit?: number; completed: boolean }[],
): SalahGrid {
  const grid: SalahGrid = {};
  for (const r of records) {
    const key = formatDateKey(r.date);
    const prayer = r.prayer as PrayerName;
    if (!PRAYERS.includes(prayer)) continue;

    if (!grid[key]) grid[key] = {};
    if (!grid[key][prayer]) grid[key][prayer] = emptySalahCell(prayer);

    const cell = grid[key][prayer]!;
    const unit = r.unit ?? 0;

    if (isFardRecord(r)) {
      cell.fard = r.completed;
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
  const byDay = new Map<string, { total: number; done: number }>();
  for (const r of fardRecords) {
    const key = formatDateKey(r.date);
    const cur = byDay.get(key) ?? { total: 0, done: 0 };
    cur.total += 1;
    if (r.completed) cur.done += 1;
    byDay.set(key, cur);
  }

  let streak = 0;
  const today = startOfDay(new Date());
  for (let i = 0; i < 365; i++) {
    const d = addDays(today, -i);
    const key = formatDateKey(d);
    const day = byDay.get(key);
    if (!day || day.done === 0) {
      if (i === 0) continue;
      break;
    }
    if (day.done >= 3) streak += 1;
    else break;
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
  joinedAt: Date,
  records: { date: Date; prayer: string; completed: boolean; kind?: string }[],
) {
  const fardRecords = records.filter(isFardRecord);
  const today = startOfDay(new Date());
  const start =
    fardRecords.length > 0
      ? startOfDay(
          fardRecords.reduce((earliest, r) => (r.date < earliest ? r.date : earliest), fardRecords[0].date)
        )
      : startOfDay(joinedAt);

  const recordMap = new Map<string, boolean>();
  for (const r of fardRecords) {
    recordMap.set(`${formatDateKey(r.date)}:${r.prayer}`, r.completed);
  }

  let expected = 0;
  let prayed = 0;
  let missed = 0;
  let activeDays = 0;
  let perfectDays = 0;
  const missedByPrayer = Object.fromEntries(PRAYERS.map((p) => [p, 0])) as Record<PrayerName, number>;

  for (let d = new Date(start); d <= today; d = addDays(d, 1)) {
    const key = formatDateKey(d);
    let dayDone = 0;

    for (const prayer of PRAYERS) {
      const slotKey = `${key}:${prayer}`;
      const logged = recordMap.get(slotKey);

      expected += 1;
      if (logged === true) {
        prayed += 1;
        dayDone += 1;
      } else {
        missed += 1;
        missedByPrayer[prayer] += 1;
      }
    }

    if (dayDone > 0) activeDays += 1;
    if (dayDone === PRAYERS.length) perfectDays += 1;
  }

  const daysOnApp = Math.max(1, Math.floor((today.getTime() - start.getTime()) / 86400000) + 1);
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
    null as (typeof byPrayer)[number] | null
  );

  return {
    lifetimePrayed: prayed,
    lifetimeMissed: missed,
    lifetimeExpected: expected,
    lifetimeRate: expected ? Math.round((prayed / expected) * 100) : 0,
    activeDays,
    perfectDays,
    daysOnApp,
    missedByPrayer,
    bestPrayer,
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
