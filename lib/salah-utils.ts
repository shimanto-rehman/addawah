import { PrayerName, PRAYERS } from './constants';

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

export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function formatDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
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

export type SalahGrid = Record<string, Partial<Record<PrayerName, boolean>>>;

export function buildSalahGrid(
  records: { date: Date; prayer: string; completed: boolean }[]
): SalahGrid {
  const grid: SalahGrid = {};
  for (const r of records) {
    const key = formatDateKey(r.date);
    if (!grid[key]) grid[key] = {};
    if (PRAYERS.includes(r.prayer as PrayerName)) {
      grid[key][r.prayer as PrayerName] = r.completed;
    }
  }
  return grid;
}

export function countCompleted(records: { completed: boolean }[]) {
  return records.filter((r) => r.completed).length;
}

export function computeStreak(records: { date: Date; completed: boolean }[]) {
  const byDay = new Map<string, { total: number; done: number }>();
  for (const r of records) {
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

export function computeLifetimeStats(records: { completed: boolean; prayer: string }[]) {
  const total = records.length;
  const completed = countCompleted(records);
  const byPrayer = PRAYERS.map((p) => {
    const subset = records.filter((r) => r.prayer === p);
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
