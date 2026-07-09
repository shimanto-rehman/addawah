/**
 * Islamic (Hijri) Calendar Engine
 *
 * Core helpers for the Islamic Calendar page:
 * - Hijri date conversion (extends the existing toHijri() in salah-utils)
 * - Event lookup from the static JSON pool
 * - Sunnah action / checklist state management (bitmap, same pattern as DailyChallenge)
 * - User completion state fetching (optimized, minimal round trips)
 * - Countdown to the next significant event
 *
 * The static event pool lives at public/data/islamic-events.json — CDN-cached,
 * zero DB cost for reads. Only per-user checklist completions hit the DB.
 */

import { prisma } from '@/lib/prisma';
import { startOfDay, formatDateKeyLocal } from '@/lib/salah-utils';
import { readFile } from 'fs/promises';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Types — exported for use by API routes and client components
// ---------------------------------------------------------------------------

export type CalendarCategory =
  | 'fasting'
  | 'prayer'
  | 'charity'
  | 'reflection'
  | 'celebration'
  | 'history';

export type CalendarSignificance = 'high' | 'medium' | 'low';

export type QuranRef = {
  surah: string;
  surahNumber: number;
  ayah: number;
  text?: string; // verse translation for inline display
};

export type HadithRef = {
  collection: string; // e.g. 'Sahih al-Bukhari', 'Sahih Muslim', 'Sunan Abu Dawud'
  number?: string; // hadith number (e.g. '968') or book+hadith (e.g. '2:13')
  narrator?: string; // e.g. 'Ibn Abbas (RA)'
  text: string; // translation of the hadith text
  url?: string; // sunnah.com link
};

export type Dua = {
  id: string;
  arabic: string; // Arabic text
  transliteration: string; // romanization
  translation: string; // English meaning
  source: string; // human-readable source, e.g. 'Quran 2:201' or 'Sahih Muslim 2713'
  sourceType: 'quran' | 'hadith';
};

export type SunnahAction = {
  index: number;
  emoji: string;
  title: string;
  subtitle: string;
  reward: number;
};

export type IslamicEvent = {
  id: string;
  hijriMonth: number; // 0 = weekly recurring, 1–12 = Hijri month
  hijriDay: number; // 0 = weekly recurring
  title: string;
  arabicTitle: string;
  category: CalendarCategory;
  significance: CalendarSignificance;
  shortStory: string;
  quranRefs: QuranRef[];
  hadithRefs: HadithRef[];
  duas: Dua[];
  sunnahActions: SunnahAction[];
  referenceUrl: string;
};

export type IslamicHistoricalEvent = {
  id: string;
  hijriMonth: number;
  hijriDay: number;
  year: string;
  title: string;
  description: string;
  quranRef: QuranRef;
  referenceUrl: string;
};

export type IslamicEventsData = {
  events: IslamicEvent[];
  monthNames: string[];
  historicalEvents: IslamicHistoricalEvent[];
};

/** Per-user checklist completion state for a single day. */
export type CalendarDayState = {
  date: string; // ISO date key (YYYY-MM-DD)
  hijriMonth: number;
  hijriDay: number;
  eventIds: string[]; // IDs resolved via CalendarPayload.eventsById
  mask: number; // bitmap of completed sunnahActions across all events for that day
  completedCount: number;
  totalCount: number;
};

/** Slim reference to an interactive event — enough for grid dots + hover bubbles. */
export type CalendarEventRef = {
  id: string;
  title: string;
  arabicTitle: string;
  category: CalendarCategory;
  significance: CalendarSignificance;
};

/** Slim reference to a historical event — enough for hover bubbles. */
export type CalendarHistoryRef = {
  id: string;
  title: string;
  year: string;
};

/** Full calendar page payload returned by the API. */
export type CalendarPayload = {
  today: CalendarDayState;
  todayHistoryIds: string[]; // resolved via historyById
  monthGrid: (CalendarDayCell | null)[];
  eventsById: Record<string, IslamicEvent>; // deduplicated full event objects
  historyById: Record<string, IslamicHistoricalEvent>; // deduplicated full history objects
  nextEvent: {
    eventTitle: string;
    eventArabicTitle: string;
    daysUntil: number;
    hijriDateTarget: string;
  } | null;
  weekCompletions: { date: string; completed: number; total: number }[];
  consistency: number; // 0..1 rolling 14-day completion rate
  view: CalendarView;
};

/** Which month is currently displayed in the grid. */
export type CalendarView = {
  gregorianYear: number;
  gregorianMonth: number; // 0-11
  gregorianMonthName: string;
  hijriMonthName: string; // the Hijri month of the 1st of the Gregorian month
  hijriYear: number;
  canGoPrev: boolean;
  canGoNext: boolean;
};

export type CalendarDayCell = {
  gregorianDay: number;
  hijriDay: number;
  hijriMonth: number;
  hijriMonthName: string;
  dateKey: string;
  isToday: boolean;
  isSelected: boolean;
  hasEvent: boolean;
  significance: CalendarSignificance | null;
  eventRefs: CalendarEventRef[];
  historyRefs: CalendarHistoryRef[];
};

// ---------------------------------------------------------------------------
// Static data loading (KV-cached, fallback to disk)
// ---------------------------------------------------------------------------

let cachedData: IslamicEventsData | null = null;

export async function loadEventsData(): Promise<IslamicEventsData> {
  if (cachedData) return cachedData;

  try {
    const filePath = join(process.cwd(), 'public', 'data', 'islamic-events.json');
    const raw = await readFile(filePath, 'utf-8');
    cachedData = JSON.parse(raw) as IslamicEventsData;
    return cachedData;
  } catch {
    // Minimal fallback so the page never crashes
    return { events: [], monthNames: getDefaultMonthNames(), historicalEvents: [] };
  }
}

function getDefaultMonthNames(): string[] {
  return [
    'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
    'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', 'Shaban',
    'Ramadan', 'Shawwal', 'Dhu al-Qidah', 'Dhu al-Hijjah',
  ];
}

// ---------------------------------------------------------------------------
// Hijri date conversion — returns numeric month/day/year
// ---------------------------------------------------------------------------

export type HijriDate = {
  day: number;
  month: number; // 1–12
  year: number;
  monthName: string;
  formatted: string;
};

const hijriFormatter = new Intl.DateTimeFormat('en-u-ca-islamic', {
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
});

/**
 * Convert a Gregorian date to numeric Hijri components.
 * Uses the same Intl API as toHijri() in salah-utils, but returns parseable numbers.
 */
export function getHijriDate(date = new Date()): HijriDate {
  const monthNames = getDefaultMonthNames();
  try {
    const parts = hijriFormatter.formatToParts(date);
    const day = parseInt(parts.find((p) => p.type === 'day')?.value ?? '1', 10);
    const month = parseInt(parts.find((p) => p.type === 'month')?.value ?? '1', 10);
    const yearStr = parts.find((p) => p.type === 'year')?.value ?? '1447';
    // Year may have trailing "AH" — strip non-digits
    const year = parseInt(yearStr.replace(/\D/g, '') || '1447', 10);

    return {
      day,
      month,
      year,
      monthName: monthNames[month - 1] ?? 'Muharram',
      formatted: `${day} ${monthNames[month - 1] ?? ''} ${year} AH`,
    };
  } catch {
    return { day: 1, month: 1, year: 1447, monthName: 'Muharram', formatted: 'Hijri calendar' };
  }
}

/**
 * Get the Hijri date for a specific day offset from today.
 * Useful for month grid generation.
 */
export function getHijriForOffset(daysFromToday: number, now = new Date()): HijriDate {
  const d = new Date(now);
  d.setDate(d.getDate() + daysFromToday);
  return getHijriDate(d);
}

// ---------------------------------------------------------------------------
// Event lookup
// ---------------------------------------------------------------------------

/**
 * Find events matching a given Hijri month/day.
 * Recurring events use month=0:
 *   - day=0: weekly (matches when dayOfWeek === 5, i.e. Jumu'ah)
 *   - day=12: weekly on Monday/Thursday (matches when dayOfWeek is 1 or 4)
 *   - day=13/14/15: monthly White Days (matches when hijriDay is 13/14/15)
 */
export function getEventsForHijriDate(
  events: IslamicEvent[],
  hijriMonth: number,
  hijriDay: number,
  dayOfWeek: number, // 0=Sunday ... 5=Friday ... 6=Saturday
): IslamicEvent[] {
  const matched: IslamicEvent[] = [];
  for (const ev of events) {
    if (ev.hijriMonth === 0) {
      // Weekly Jumu'ah
      if (ev.hijriDay === 0 && dayOfWeek === 5) {
        matched.push(ev);
        continue;
      }
      // Weekly Monday/Thursday fast
      if (ev.hijriDay === 12 && (dayOfWeek === 1 || dayOfWeek === 4)) {
        matched.push(ev);
        continue;
      }
      // Monthly White Days (13, 14, 15 of every Hijri month)
      if (ev.hijriDay === 13 && hijriDay >= 13 && hijriDay <= 15) {
        matched.push(ev);
        continue;
      }
    }
    // Specific Hijri date match
    if (ev.hijriMonth === hijriMonth && ev.hijriDay === hijriDay) {
      matched.push(ev);
    }
  }
  // Sort by significance (high > medium > low)
  const sigOrder: Record<CalendarSignificance, number> = { high: 0, medium: 1, low: 2 };
  matched.sort((a, b) => sigOrder[a.significance] - sigOrder[b.significance]);
  return matched;
}

/**
 * Find historical events matching a given Hijri month/day.
 */
export function getHistoricalEventsForHijriDate(
  events: IslamicHistoricalEvent[],
  hijriMonth: number,
  hijriDay: number,
): IslamicHistoricalEvent[] {
  return events.filter((e) => e.hijriMonth === hijriMonth && e.hijriDay === hijriDay);
}

/**
 * Find the next significant event after today.
 * Searches forward day by day until a match is found (max 355 days = one Hijri year).
 */
export function findNextEvent(
  events: IslamicEvent[],
  now = new Date(),
): { eventTitle: string; eventArabicTitle: string; daysUntil: number; hijriDateTarget: string } | null {
  const sigOrder: Record<CalendarSignificance, number> = { high: 0, medium: 1, low: 2 };
  // Only look for non-weekly events with at least medium significance
  const candidates = events
    .filter((e) => e.hijriMonth > 0 && e.significance !== 'low')
    .sort((a, b) => sigOrder[a.significance] - sigOrder[b.significance]);

  if (candidates.length === 0) return null;

  for (let offset = 1; offset <= 355; offset++) {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    const hijri = getHijriDate(d);
    const match = candidates.find(
      (e) => e.hijriMonth === hijri.month && e.hijriDay === hijri.day,
    );
    if (match) {
      return {
        eventTitle: match.title,
        eventArabicTitle: match.arabicTitle,
        daysUntil: offset,
        hijriDateTarget: `${hijri.day} ${hijri.monthName} ${hijri.year} AH`,
      };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Bitmap helpers (same pattern as DailyChallenge)
// ---------------------------------------------------------------------------

/**
 * Read a bit from the completion mask.
 * Bits are globally indexed across all events for a given day:
 *   event[0].action[0] = bit 0, event[0].action[1] = bit 1, ...
 *   event[1].action[0] = bit (len(event[0].actions)), ...
 */
export function isActionDone(mask: number, bitIndex: number): boolean {
  return (mask & (1 << bitIndex)) !== 0;
}

/**
 * Compute the total number of sunnah actions across a set of events.
 * Used to determine the bitmap range and total count.
 */
export function totalActionsForEvents(events: IslamicEvent[]): number {
  return events.reduce((sum, e) => sum + e.sunnahActions.length, 0);
}

/**
 * Count completed actions from a mask, given the events for that day.
 */
export function countCompleted(mask: number, events: IslamicEvent[]): number {
  let count = 0;
  let bitOffset = 0;
  for (const ev of events) {
    for (let i = 0; i < ev.sunnahActions.length; i++) {
      if (isActionDone(mask, bitOffset + i)) count++;
    }
    bitOffset += ev.sunnahActions.length;
  }
  return count;
}

// ---------------------------------------------------------------------------
// Month grid generation
// ---------------------------------------------------------------------------

/**
 * Generate a grid of day cells for a Gregorian month view.
 *
 * Produces a fixed-length grid of 42 slots (6 weeks) so rows line up under
 * weekday headers. Leading slots before the 1st are `null` (caller renders
 * blanks). Each real cell carries its Hijri date, interactive + historical
 * events, and completion status — enough to render a rich day popover without
 * a round-trip.
 *
 * @param anchor  Any date inside the month to display (defaults to today).
 * @param events  Static interactive event pool.
 * @param historicalEvents  Static historical event pool.
 * @param today   Reference "today" for isToday flags (defaults to now).
 * @returns Array of `CalendarDayCell | null` (null = empty padding slot).
 */
export function buildMonthGrid(
  anchor: Date,
  events: IslamicEvent[],
  historicalEvents: IslamicHistoricalEvent[],
  today: Date = new Date(),
): (CalendarDayCell | null)[] {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const todayKey = formatDateKeyLocal(today);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = new Date(year, month, 1).getDay(); // 0=Sunday

  const cells: (CalendarDayCell | null)[] = [];

  // Leading padding
  for (let i = 0; i < startWeekday; i++) cells.push(null);

  for (let day = 1; day <= daysInMonth; day++) {
    const cellDate = new Date(year, month, day);
    const hijri = getHijriDate(cellDate);
    const dayEvents = getEventsForHijriDate(
      events,
      hijri.month,
      hijri.day,
      cellDate.getDay(),
    );
    const dayHistory = getHistoricalEventsForHijriDate(
      historicalEvents,
      hijri.month,
      hijri.day,
    );
    const dateKey = formatDateKeyLocal(cellDate);

    cells.push({
      gregorianDay: day,
      hijriDay: hijri.day,
      hijriMonth: hijri.month,
      hijriMonthName: hijri.monthName,
      dateKey,
      isToday: dateKey === todayKey,
      isSelected: false,
      hasEvent: dayEvents.length > 0 || dayHistory.length > 0,
      significance: dayEvents.length > 0 ? dayEvents[0].significance : null,
      eventRefs: dayEvents.map((e) => ({
        id: e.id,
        title: e.title,
        arabicTitle: e.arabicTitle,
        category: e.category,
        significance: e.significance,
      })),
      historyRefs: dayHistory.map((h) => ({
        id: h.id,
        title: h.title,
        year: h.year,
      })),
    });
  }

  // Trailing padding to fill out the last week row
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

/** Gregorian month names for the view header. */
const GREGORIAN_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Build the view descriptor for a given anchor month, used for the month
 * navigation header (dual Gregorian + Hijri label) and prev/next gating.
 */
export function buildCalendarView(
  anchor: Date,
  today: Date = new Date(),
): CalendarView {
  const hijri = getHijriDate(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
  // Limit navigation to ±2 years from today to keep the payload bounded.
  const min = new Date(today.getFullYear() - 2, 0, 1);
  const max = new Date(today.getFullYear() + 2, 11, 31);
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  return {
    gregorianYear: anchor.getFullYear(),
    gregorianMonth: anchor.getMonth(),
    gregorianMonthName: GREGORIAN_MONTH_NAMES[anchor.getMonth()],
    hijriMonthName: hijri.monthName,
    hijriYear: hijri.year,
    canGoPrev: firstOfMonth > min,
    canGoNext: firstOfMonth < max,
  };
}


// ---------------------------------------------------------------------------
// User state — optimized DB queries
// ---------------------------------------------------------------------------

/**
 * Fetch the user's completion masks for a range of dates in a single query.
 */
export async function getUserCompletions(
  userId: string,
  startDate: Date,
  endDate: Date,
): Promise<Map<string, number>> {
  const rows = await prisma.calendarTaskCompletion.findMany({
    where: { userId, date: { gte: startDate, lte: endDate } },
    select: { date: true, mask: true },
  });
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(formatDateKeyLocal(r.date), r.mask);
  }
  return map;
}

/**
 * Build the complete calendar page payload for a user.
 * Single optimized flow: load static data once, fetch user completions once,
 * derive everything else in-memory.
 *
 * @param userId
 * @param now   "Today" reference — drives today's checklist, next-event
 *              countdown, and the 14-day rolling consistency window.
 * @param viewDate  Anchor for the month grid. Defaults to `now` (current
 *                  month). When the user navigates to another month, pass the
 *                  1st of that month so the grid + view header reflect it.
 */
export async function buildCalendarPayload(
  userId: string,
  now = new Date(),
  viewDate?: Date,
): Promise<CalendarPayload> {
  const data = await loadEventsData();
  const events = data.events;
  const historicalEvents = data.historicalEvents;
  const today = startOfDay(now);
  const todayHijri = getHijriDate(now);
  const todayKey = formatDateKeyLocal(now);

  const anchor = viewDate ?? now;

  // Fetch user completions for the viewed month + 14-day rolling window in a
  // single query. Union both ranges so we never need a second round-trip.
  const viewMonthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const viewMonthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const todayMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const windowStart = new Date(now.getTime() - 13 * 86_400_000);

  const rangeStart = viewMonthStart < windowStart ? viewMonthStart : windowStart;
  const rangeEnd = viewMonthEnd > todayMonthEnd ? viewMonthEnd : todayMonthEnd;

  const completionMap = await getUserCompletions(userId, rangeStart, rangeEnd);

  // Today's state
  const todayEvents = getEventsForHijriDate(
    events,
    todayHijri.month,
    todayHijri.day,
    now.getDay(),
  );
  const todayMask = completionMap.get(todayKey) ?? 0;
  const todayTotal = totalActionsForEvents(todayEvents);
  const todayCompleted = countCompleted(todayMask, todayEvents);

  // Today's historical events ("on this day in Islamic history")
  const todayHistory = getHistoricalEventsForHijriDate(
    historicalEvents,
    todayHijri.month,
    todayHijri.day,
  );

  // Month grid (anchored to the navigated month)
  const monthGrid = buildMonthGrid(anchor, events, historicalEvents, today);

  // View descriptor (dual Gregorian + Hijri header, nav gating)
  const view = buildCalendarView(anchor, today);

  // Next significant event
  const nextEvent = findNextEvent(events, now);

  // Week completions (last 7 days relative to today)
  const weekCompletions: { date: string; completed: number; total: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000);
    const dKey = formatDateKeyLocal(d);
    const dHijri = getHijriDate(d);
    const dEvents = getEventsForHijriDate(events, dHijri.month, dHijri.day, d.getDay());
    const dMask = completionMap.get(dKey) ?? 0;
    weekCompletions.push({
      date: dKey,
      completed: countCompleted(dMask, dEvents),
      total: totalActionsForEvents(dEvents),
    });
  }

  // 14-day consistency (for ruhaniah weakness signal)
  let consistencyTotal = 0;
  let consistencyPossible = 0;
  for (let i = 0; i < 14; i++) {
    const d = new Date(now.getTime() - i * 86_400_000);
    const dKey = formatDateKeyLocal(d);
    const dHijri = getHijriDate(d);
    const dEvents = getEventsForHijriDate(events, dHijri.month, dHijri.day, d.getDay());
    const total = totalActionsForEvents(dEvents);
    if (total > 0) {
      const dMask = completionMap.get(dKey) ?? 0;
      consistencyTotal += countCompleted(dMask, dEvents);
      consistencyPossible += total;
    }
  }
  const consistency = consistencyPossible > 0 ? consistencyTotal / consistencyPossible : 0;

  // Build deduplicated lookup maps: every event referenced in the grid or
  // today's events appears once in eventsById; likewise for historyById.
  const eventsById: Record<string, IslamicEvent> = {};
  const historyById: Record<string, IslamicHistoricalEvent> = {};
  for (const ev of todayEvents) eventsById[ev.id] = ev;
  for (const h of todayHistory) historyById[h.id] = h;
  for (const cell of monthGrid) {
    if (!cell) continue;
    for (const ref of cell.eventRefs) {
      if (!eventsById[ref.id]) {
        const full = events.find((e) => e.id === ref.id);
        if (full) eventsById[ref.id] = full;
      }
    }
    for (const ref of cell.historyRefs) {
      if (!historyById[ref.id]) {
        const full = historicalEvents.find((h) => h.id === ref.id);
        if (full) historyById[ref.id] = full;
      }
    }
  }

  return {
    today: {
      date: todayKey,
      hijriMonth: todayHijri.month,
      hijriDay: todayHijri.day,
      eventIds: todayEvents.map((e) => e.id),
      mask: todayMask,
      completedCount: todayCompleted,
      totalCount: todayTotal,
    },
    todayHistoryIds: todayHistory.map((h) => h.id),
    monthGrid,
    eventsById,
    historyById,
    nextEvent,
    weekCompletions,
    consistency,
    view,
  };
}

/**
 * Toggle a sunnah action for today.
 * Computes the global bit index from the event + action indices.
 *
 * @returns The new mask and completion counts
 */
export async function toggleCalendarAction(
  userId: string,
  eventId: string,
  actionIndex: number,
  now = new Date(),
): Promise<{ mask: number; completedCount: number; totalCount: number; delta: number }> {
  const data = await loadEventsData();
  const today = startOfDay(now);
  const hijri = getHijriDate(now);
  const todayEvents = getEventsForHijriDate(data.events, hijri.month, hijri.day, now.getDay());

  // Calculate the global bit offset for this event's action
  let bitOffset = 0;
  let foundEvent: IslamicEvent | null = null;
  for (const ev of todayEvents) {
    if (ev.id === eventId) {
      foundEvent = ev;
      break;
    }
    bitOffset += ev.sunnahActions.length;
  }

  if (!foundEvent) {
    throw new Error(`Event ${eventId} not found for today`);
  }

  const targetBit = bitOffset + actionIndex;

  // Upsert: toggle the bit in the mask
  const existing = await prisma.calendarTaskCompletion.findUnique({
    where: { userId_date: { userId, date: today } },
    select: { mask: true },
  });

  const currentMask = existing?.mask ?? 0;
  const wasDone = isActionDone(currentMask, targetBit);
  const newMask = wasDone ? (currentMask & ~(1 << targetBit)) : (currentMask | (1 << targetBit));
  const delta = wasDone ? -1 : 1;

  await prisma.calendarTaskCompletion.upsert({
    where: { userId_date: { userId, date: today } },
    create: { userId, date: today, mask: newMask },
    update: { mask: newMask },
  });

  const completedCount = countCompleted(newMask, todayEvents);
  const totalCount = totalActionsForEvents(todayEvents);

  return { mask: newMask, completedCount, totalCount, delta };
}


// ---------------------------------------------------------------------------
// Consistency signal (for ruhaniah weakness analysis)
// ---------------------------------------------------------------------------

/**
 * Compute the rolling 14-day calendar completion consistency.
 * Used by ruhaniah weakness analysis — surfaces "calendar-drift" when low.
 */
export async function getCalendarConsistency(
  userId: string,
  windowDays = 14,
  now = new Date(),
): Promise<number> {
  const today = startOfDay(now);
  const since = new Date(today.getTime() - (windowDays - 1) * 86_400_000);

  const rows = await prisma.calendarTaskCompletion.findMany({
    where: { userId, date: { gte: since, lte: today } },
    select: { mask: true, date: true },
  });

  if (rows.length === 0) return 0;

  const data = await loadEventsData();
  const events = data.events;

  let totalDone = 0;
  let totalPossible = 0;

  for (const row of rows) {
    const d = new Date(row.date);
    const hijri = getHijriDate(d);
    const dEvents = getEventsForHijriDate(events, hijri.month, hijri.day, d.getDay());
    const total = totalActionsForEvents(dEvents);
    totalPossible += total;
    totalDone += countCompleted(row.mask, dEvents);
  }

  return totalPossible > 0 ? Math.min(1, totalDone / totalPossible) : 0;
}
