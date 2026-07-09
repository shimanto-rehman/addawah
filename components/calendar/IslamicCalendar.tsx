'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import { useApp } from '@/components/providers/AppProvider';
import { swrFetcher } from '@/lib/swr-fetcher';
import { Shimmer } from '@/components/ui/Shimmer';
import type {
  CalendarPayload,
  IslamicEvent,
  IslamicHistoricalEvent,
} from '@/lib/islamic-calendar';

const EASE = [0.22, 1, 0.36, 1] as const;

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const WEEKDAY_NARROW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

const CATEGORY_LABELS: Record<string, string> = {
  fasting: 'Fasting',
  prayer: 'Prayer',
  charity: 'Charity',
  reflection: 'Reflection',
  celebration: 'Celebration',
  history: 'History',
};

function isActionDone(mask: number, bitIndex: number): boolean {
  return (mask & (1 << bitIndex)) !== 0;
}

/** SWR key carries the viewed year/month so navigation refetches the grid.
 *  `viewMonth` is 0-indexed (JS Date convention); the API expects 1–12. */
function calendarKey(viewYear: number, viewMonth: number): string {
  return `/api/calendar?year=${viewYear}&month=${viewMonth + 1}`;
}

export function IslamicCalendar() {
  const { user, loading } = useApp();

  // Viewed month — starts at the real current month.
  const now = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0–11
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [coinsToast, setCoinsToast] = useState<number | null>(null);

  const key = user && !loading ? calendarKey(viewYear, viewMonth) : null;
  const { data, isLoading, mutate } = useSWR<CalendarPayload>(key, swrFetcher, {
    keepPreviousData: true,
  });

  const toggle = useCallback(
    async (eventId: string, actionIndex: number) => {
      const tKey = `${eventId}:${actionIndex}`;
      const optimistic = data ? { ...data } : null;
      if (optimistic) {
        // Resolve full event objects from eventsById to compute the bit offset.
        const todayEvents = optimistic.today.eventIds
          .map((id) => optimistic.eventsById[id])
          .filter((e): e is IslamicEvent => Boolean(e));
        let bitOffset = 0;
        for (const ev of todayEvents) {
          if (ev.id === eventId) break;
          bitOffset += ev.sunnahActions.length;
        }
        const targetBit = bitOffset + actionIndex;
        const wasDone = isActionDone(optimistic.today.mask, targetBit);
        optimistic.today = {
          ...optimistic.today,
          mask: wasDone
            ? optimistic.today.mask & ~(1 << targetBit)
            : optimistic.today.mask | (1 << targetBit),
          completedCount: wasDone
            ? optimistic.today.completedCount - 1
            : optimistic.today.completedCount + 1,
        };
        await mutate(optimistic, { revalidate: false });
      }

      try {
        const res = await fetch('/api/calendar/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId, actionIndex }),
        });
        if (!res.ok) throw new Error('Toggle failed');
        const result = await res.json();
        if (result.coinsEarned > 0) {
          setCoinsToast(result.coinsEarned);
          setTimeout(() => setCoinsToast(null), 2500);
        }
      } catch {
        await mutate();
      } finally {
        setToggling(null);
      }
    },
    [data, mutate],
  );

  const goPrevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
    setSelectedDateKey(null);
  }, []);

  const goNextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
    setSelectedDateKey(null);
  }, []);

  const goToday = useCallback(() => {
    const t = new Date();
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
    setSelectedDateKey(null);
  }, []);

  if (isLoading || !data) return <CalendarShimmer />;

  const totalActions = data.today.totalCount;
  const completedActions = data.today.completedCount;
  const progressPct = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;

  // The selected cell (from the viewed month grid), if any.
  const selectedCell = selectedDateKey
    ? data.monthGrid.find((c) => c && c.dateKey === selectedDateKey) ?? null
    : null;
  // The "active day" is whichever cell the user clicked, or today by default.
  const isTodayActive = !selectedCell || selectedCell.isToday;
  const activeEvents: IslamicEvent[] = selectedCell
    ? selectedCell.eventRefs.map((r) => data.eventsById[r.id]).filter((e): e is IslamicEvent => Boolean(e))
    : data.today.eventIds.map((id) => data.eventsById[id]).filter((e): e is IslamicEvent => Boolean(e));
  const activeHistory: IslamicHistoricalEvent[] = selectedCell
    ? selectedCell.historyRefs.map((r) => data.historyById[r.id]).filter((h): h is IslamicHistoricalEvent => Boolean(h))
    : data.todayHistoryIds.map((id) => data.historyById[id]).filter((h): h is IslamicHistoricalEvent => Boolean(h));

  return (
    <div className="dawa-calendar">
      {/* Coins earned toast */}
      <AnimatePresence>
        {coinsToast !== null && (
          <motion.div
            className="dawa-calendar__toast"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            +{coinsToast} 🪙 gold coins earned
          </motion.div>
        )}
      </AnimatePresence>

      <div className="dawa-calendar__grid">
        {/* === LEFT COLUMN === */}
        <div className="dawa-calendar__col-left">
          {/* Countdown to next event */}
          {data.nextEvent && (
            <motion.section
              className="dawa-calendar__countdown dawa-glass"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <div className="dawa-calendar__countdown-inner">
                <span className="dawa-calendar__countdown-label">Next sacred day</span>
                <span className="dawa-calendar__countdown-days">
                  <span className="dawa-num">{data.nextEvent.daysUntil}</span> days
                </span>
              </div>
              <h3 className="dawa-calendar__countdown-title">
                {data.nextEvent.eventTitle}
              </h3>
              <p className="dawa-calendar__countdown-arabic">
                {data.nextEvent.eventArabicTitle}
              </p>
              <p className="dawa-calendar__countdown-target">{data.nextEvent.hijriDateTarget}</p>
            </motion.section>
          )}

          {/* Month grid + navigation */}
          <motion.section
            className="dawa-calendar__month dawa-glass"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
            aria-label="Islamic calendar month view"
          >
            <header className="dawa-calendar__month-header">
              <button
                type="button"
                className="dawa-calendar__nav-btn"
                onClick={goPrevMonth}
                disabled={!data.view.canGoPrev}
                aria-label="Previous month"
              >
                ‹
              </button>
              <div className="dawa-calendar__month-titles">
                <h3 className="dawa-calendar__month-greg">
                  {data.view.gregorianMonthName} {data.view.gregorianYear}
                </h3>
                <p className="dawa-calendar__month-hijri">
                  {data.view.hijriMonthName} {data.view.hijriYear} AH
                </p>
              </div>
              <button
                type="button"
                className="dawa-calendar__nav-btn"
                onClick={goNextMonth}
                disabled={!data.view.canGoNext}
                aria-label="Next month"
              >
                ›
              </button>
            </header>

            <button
              type="button"
              className="dawa-calendar__today-btn"
              onClick={goToday}
            >
              Today
            </button>

            {/* Significance legend */}
            <div className="dawa-calendar__legend">
              <span className="dawa-calendar__legend-item">
                <span className="dawa-calendar__legend-dot is-high" /> Sacred
              </span>
              <span className="dawa-calendar__legend-item">
                <span className="dawa-calendar__legend-dot is-medium" /> Notable
              </span>
              <span className="dawa-calendar__legend-item">
                <span className="dawa-calendar__legend-dot is-low" /> Voluntary
              </span>
            </div>

            <div className="dawa-calendar__month-grid">
              {WEEKDAY_LABELS.map((d, i) => (
                <span key={i} className="dawa-calendar__dow">
                  <span className="dawa-calendar__dow-full">{d}</span>
                  <span className="dawa-calendar__dow-narrow">{WEEKDAY_NARROW[i]}</span>
                </span>
              ))}
              {data.monthGrid.map((cell, i) => {
                if (!cell) {
                  return <span key={`pad-${i}`} className="dawa-calendar__cell-blank" aria-hidden />;
                }
                const isSelected = cell.dateKey === selectedDateKey;
                const sigClass = cell.significance ? ` sig-${cell.significance}` : '';
                const eventCount = cell.eventRefs.length + cell.historyRefs.length;
                return (
                  <button
                    type="button"
                    key={cell.dateKey}
                    className={[
                      'dawa-calendar__cell',
                      cell.isToday ? ' is-today' : '',
                      cell.hasEvent ? ' has-event' : '',
                      sigClass,
                      isSelected ? ' is-selected' : '',
                    ].join('')}
                    onClick={() => setSelectedDateKey(isSelected ? null : cell.dateKey)}
                    aria-pressed={isSelected}
                    aria-label={`${cell.gregorianDay} ${data.view.gregorianMonthName} — ${cell.hijriDay} ${cell.hijriMonthName}. ${cell.eventRefs.map((r) => r.title).join(', ') || 'No events'}`}
                  >
                    <span className="dawa-calendar__cell-greg">{cell.gregorianDay}</span>
                    <span className="dawa-calendar__cell-hijri dawa-num">{cell.hijriDay}</span>
                    {cell.significance && (
                      <span className={`dawa-calendar__cell-dot sig-${cell.significance}`} />
                    )}
                    {cell.hasEvent && (
                      <span className="dawa-calendar__cell-badges">
                        {eventCount > 1 && (
                          <span className="dawa-calendar__cell-count">{eventCount}</span>
                        )}
                      </span>
                    )}
                    {cell.hasEvent && (cell.eventRefs.length > 0 || cell.historyRefs.length > 0) && (
                      <span className="dawa-calendar__cell-bubble">
                        <span className="dawa-calendar__cell-bubble-inner">
                          {cell.eventRefs.slice(0, 3).map((ev) => (
                            <span key={ev.id} className="dawa-calendar__cell-bubble-event">
                              <span className={`dawa-calendar__cell-bubble-dot sig-${ev.significance}`} />
                              {ev.title}
                            </span>
                          ))}
                          {cell.historyRefs.slice(0, 2).map((hist) => (
                            <span key={hist.id} className="dawa-calendar__cell-bubble-event is-history">
                              <span className="dawa-calendar__cell-bubble-dot is-history" />
                              {hist.title}
                            </span>
                          ))}
                          {eventCount > 5 && (
                            <span className="dawa-calendar__cell-bubble-more">+{eventCount - 5} more</span>
                          )}
                        </span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <p className="dawa-calendar__hint">
              Tap a day to see its events. Each cell shows the Gregorian date above and the Hijri date below.
            </p>
          </motion.section>
          {/* Plan of the day — below calendar for symmetry */}
          {activeEvents.length > 0 && (
            <PlanCard
              events={activeEvents}
              mask={isTodayActive ? data.today.mask : 0}
              toggle={toggle}
              toggling={toggling}
              delay={0.15}
              isToday={isTodayActive}
              dayLabel={selectedCell ? `${selectedCell.hijriDay} ${selectedCell.hijriMonthName}` : undefined}
            />
          )}
          {/* On This Day in Islamic History */}
          {activeHistory.length > 0 && (
            <motion.section
              className="dawa-calendar__history dawa-glass"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
            >
              <h3 className="dawa-calendar__section-title">
                <span className="dawa-calendar__section-icon">📜</span>
                On This Day in Islamic History
              </h3>
              <div className="dawa-calendar__history-list">
                {activeHistory.map((hist, i) => (
                  <HistoryCard key={hist.id} event={hist} delay={0.2 + i * 0.08} />
                ))}
              </div>
            </motion.section>
          )}
        </div>

        {/* === RIGHT COLUMN === */}
        <div className="dawa-calendar__col-right">
          {/* Day header — shows which day's events are displayed */}
          <AnimatePresence mode="wait">
            {selectedCell ? (
              <motion.div
                key={`hdr-${selectedCell.dateKey}`}
                className="dawa-calendar__active-day-header"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: EASE }}
              >
                <div>
                  <span className="dawa-calendar__active-day-greg">
                    {selectedCell.gregorianDay} {data.view.gregorianMonthName} {data.view.gregorianYear}
                  </span>
                  <span className="dawa-calendar__active-day-hijri">
                    {selectedCell.hijriDay} {selectedCell.hijriMonthName} {data.view.hijriYear} AH
                  </span>
                </div>
                <button
                  type="button"
                  className="dawa-calendar__selected-close"
                  onClick={() => setSelectedDateKey(null)}
                  aria-label="Back to today"
                >
                  ✕
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="hdr-today"
                className="dawa-calendar__active-day-header is-today"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: EASE }}
              >
                <div>
                  <span className="dawa-calendar__active-day-greg">Today</span>
                  <span className="dawa-calendar__active-day-hijri">
                    {data.today.hijriDay} {data.view.hijriMonthName} {data.view.hijriYear} AH
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress summary (today only — toggling only works for today) */}
          {isTodayActive && totalActions > 0 && (
            <motion.div
              className="dawa-calendar__progress dawa-glass"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <div className="dawa-calendar__progress-inner">
                <span className="dawa-calendar__progress-count">
                  <span className="dawa-num">{completedActions}</span>
                  <span className="dawa-calendar__progress-total">/{totalActions}</span>
                </span>
                <span className="dawa-calendar__progress-label">sunnah actions today</span>
              </div>
              <div className="dawa-calendar__progress-bar">
                <div className="dawa-calendar__progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
            </motion.div>
          )}

          {/* Active day's events: story, Quran refs, hadith refs, duas */}
          {activeEvents.length > 0 ? (
            <AnimatePresence mode="popLayout">
              {activeEvents.map((ev, evIdx) => (
                <EventCard
                  key={ev.id}
                  event={ev}
                  delay={0.2 + evIdx * 0.1}
                />
              ))}
            </AnimatePresence>
          ) : (
            <motion.section
              className="dawa-calendar__no-events dawa-glass"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
            >
              <div className="dawa-calendar__no-events-icon">🌙</div>
              <p className="dawa-calendar__no-events-text">
                No special Islamic event on this day. Keep up your daily salah and adhkar —
                every ordinary day is an opportunity for extraordinary reward.
              </p>
              {!isTodayActive && (
                <p className="dawa-calendar__no-events-hint">
                  💡 Select today's date to see and track your sunnah action plan.
                </p>
              )}
              {isTodayActive && (
                <p className="dawa-calendar__no-events-hint">
                  💡 Try fasting on the White Days (13th–15th of each Hijri month) or on
                  Mondays and Thursdays — a beautiful sunnah of the Prophet ﷺ.
                </p>
              )}
            </motion.section>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function HistoryCard({ event, delay }: { event: IslamicHistoricalEvent; delay: number }) {
  return (
    <motion.article
      className="dawa-calendar__history-card"
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay, ease: EASE }}
    >
      <div className="dawa-calendar__history-year">{event.year}</div>
      <div className="dawa-calendar__history-body">
        <h4 className="dawa-calendar__history-title">{event.title}</h4>
        <p className="dawa-calendar__history-desc">{event.description}</p>
        <a
          href={`https://quran.com/${event.quranRef.surahNumber}:${event.quranRef.ayah}`}
          target="_blank"
          rel="noopener noreferrer"
          className="dawa-calendar__history-ref"
        >
          📖 {event.quranRef.surah} {event.quranRef.surahNumber}:{event.quranRef.ayah}
        </a>
      </div>
    </motion.article>
  );
}


function EventCard({
  event,
  delay,
}: {
  event: IslamicEvent;
  delay: number;
}) {
  return (
    <motion.section
      className="dawa-calendar__event dawa-glass"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: EASE }}
    >
      <header className="dawa-calendar__event-head">
        <span
          className={`dawa-calendar__event-sig-pill sig-${event.significance}`}
          title={`${event.significance} significance`}
        >
          <span className="dawa-calendar__event-sig-dot" />
          {event.significance === 'high' ? 'Sacred day' : event.significance === 'medium' ? 'Notable day' : 'Voluntary'}
        </span>
        <span className="dawa-calendar__event-cat">
          {CATEGORY_LABELS[event.category] ?? event.category}
        </span>
      </header>
      <h2 className="dawa-calendar__event-title">{event.title}</h2>
      {event.arabicTitle && (
        <p className="dawa-calendar__event-arabic">{event.arabicTitle}</p>
      )}

      {/* Story */}
      <div className="dawa-calendar__story">
        <p className="dawa-calendar__story-text">{event.shortStory}</p>
      </div>

      {/* Quran references with verse text */}
      {event.quranRefs.length > 0 && (
        <div className="dawa-calendar__refs">
          <span className="dawa-calendar__refs-label">📖 Quran references</span>
          <div className="dawa-calendar__refs-verses">
            {event.quranRefs.map((ref, i) => (
              <div key={i} className="dawa-calendar__verse">
                <a
                  href={`https://quran.com/${ref.surahNumber}:${ref.ayah}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dawa-calendar__ref-chip"
                >
                  {ref.surah} {ref.surahNumber}:{ref.ayah}
                </a>
                {ref.text && (
                  <p className="dawa-calendar__verse-text">"{ref.text}"</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hadith references */}
      {event.hadithRefs && event.hadithRefs.length > 0 && (
        <div className="dawa-calendar__hadith">
          <span className="dawa-calendar__refs-label">🕌 Hadith references</span>
          <div className="dawa-calendar__hadith-list">
            {event.hadithRefs.map((ref, i) => (
              <div key={i} className="dawa-calendar__hadith-item">
                <div className="dawa-calendar__hadith-head">
                  <span className="dawa-calendar__hadith-collection">{ref.collection}</span>
                  {ref.number && <span className="dawa-calendar__hadith-num">#{ref.number}</span>}
                  {ref.narrator && <span className="dawa-calendar__hadith-narrator">{ref.narrator}</span>}
                </div>
                <p className="dawa-calendar__hadith-text">"{ref.text}"</p>
                {ref.url && (
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dawa-calendar__hadith-link"
                  >
                    Read full hadith →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Duas & Dhikr */}
      {event.duas && event.duas.length > 0 && (
        <div className="dawa-calendar__duas">
          <span className="dawa-calendar__refs-label">🤲 Duas &amp; Dhikr</span>
          <div className="dawa-calendar__duas-list">
            {event.duas.map((dua) => (
              <div key={dua.id} className="dawa-calendar__dua">
                <p className="dawa-calendar__dua-arabic" dir="rtl">{dua.arabic}</p>
                <p className="dawa-calendar__dua-translit">{dua.transliteration}</p>
                <p className="dawa-calendar__dua-translation">"{dua.translation}"</p>
                <span className={`dawa-calendar__dua-source is-${dua.sourceType}`}>
                  {dua.sourceType === 'quran' ? '📖' : '🕌'} {dua.source}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reference link */}
      <a
        href={event.referenceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="dawa-calendar__source"
      >
        Learn more →
      </a>
    </motion.section>
  );
}

function PlanCard({
  events,
  mask,
  toggle,
  toggling,
  delay,
  isToday,
  dayLabel,
}: {
  events: IslamicEvent[];
  mask: number;
  toggle: (eventId: string, actionIndex: number) => void;
  toggling: string | null;
  delay: number;
  isToday: boolean;
  dayLabel?: string;
}) {
  const groups = useMemo(() => {
    const result: { event: IslamicEvent; bitOffset: number }[] = [];
    let offset = 0;
    for (const ev of events) {
      result.push({ event: ev, bitOffset: offset });
      offset += ev.sunnahActions.length;
    }
    return result;
  }, [events]);

  return (
    <motion.section
      className="dawa-calendar__plan-card dawa-glass"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: EASE }}
    >
      <h3 className="dawa-calendar__plan-card-title">
        {isToday ? 'Plan of the day' : `Plan for ${dayLabel ?? 'this day'}`}
        {!isToday && (
          <span className="dawa-calendar__plan-card-info">View only — return to today to track</span>
        )}
      </h3>
      {groups.map(({ event, bitOffset }) => (
        <div key={event.id} className="dawa-calendar__plan-group">
          {events.length > 1 && (
            <h4 className="dawa-calendar__plan-group-title">{event.title}</h4>
          )}
          <ul className="dawa-calendar__checklist">
            {event.sunnahActions.map((action, i) => {
              const bitIndex = bitOffset + i;
              const done = isActionDone(mask, bitIndex);
              const tKey = `${event.id}:${i}`;
              return (
                <li key={i}>
                  <button
                    type="button"
                    className={`dawa-calendar__action${done ? ' is-done' : ''}${!isToday ? ' is-readonly' : ''}`}
                    aria-pressed={isToday ? done : undefined}
                    disabled={!isToday || (toggling !== null && toggling !== tKey)}
                    onClick={isToday ? () => toggle(event.id, i) : undefined}
                  >
                    <span className="dawa-calendar__action-emoji">{action.emoji}</span>
                    <span className="dawa-calendar__action-body">
                      <span className="dawa-calendar__action-title">{action.title}</span>
                      <span className="dawa-calendar__action-sub">{action.subtitle}</span>
                    </span>
                    <span className="dawa-calendar__action-reward">
                      +{action.reward} 🪙
                    </span>
                    <span className={`dawa-calendar__action-check${done ? ' is-checked' : ''}`}>
                      {done ? '✓' : ''}
                    </span>
                    {toggling === tKey && <span className="dawa-calendar__action-spinner" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </motion.section>
  );
}

function CalendarShimmer() {
  return (
    <div className="dawa-calendar dawa-calendar--loading">
      <div className="dawa-calendar__grid">
        {/* === LEFT COLUMN === */}
        <div className="dawa-calendar__col-left">
          {/* Countdown */}
          <div className="dawa-calendar__countdown dawa-glass">
            <div className="dawa-calendar__countdown-inner">
              <Shimmer variant="text-sm" width="120px" />
              <Shimmer variant="text" width="60px" />
            </div>
            <Shimmer variant="text-lg" width="200px" />
            <Shimmer variant="text-sm" width="160px" />
          </div>
          {/* Calendar month */}
          <div className="dawa-calendar__month dawa-glass">
            <div className="dawa-calendar__month-header">
              <Shimmer variant="circle" width="32px" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                <Shimmer variant="text" width="180px" />
                <Shimmer variant="text-sm" width="120px" />
              </div>
              <Shimmer variant="circle" width="32px" />
            </div>
            <div className="dawa-calendar__legend">
              <Shimmer variant="text-sm" width="280px" />
            </div>
            <div className="dawa-calendar__month-grid">
              {Array.from({ length: 42 }, (_, i) => (
                <Shimmer key={i} variant="rect" width="100%" height="44px" borderRadius="10px" />
              ))}
            </div>
          </div>
          {/* Plan of the day */}
          <div className="dawa-calendar__plan dawa-glass">
            <Shimmer variant="text" width="160px" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Shimmer variant="rect" width="100%" height="36px" borderRadius="8px" />
              <Shimmer variant="rect" width="100%" height="36px" borderRadius="8px" />
              <Shimmer variant="rect" width="100%" height="36px" borderRadius="8px" />
            </div>
          </div>
        </div>
        {/* === RIGHT COLUMN === */}
        <div className="dawa-calendar__col-right">
          {/* Day header */}
          <div className="dawa-calendar__active-day-header">
            <Shimmer variant="text" width="80px" />
            <Shimmer variant="text-sm" width="140px" />
          </div>
          {/* Progress */}
          <div className="dawa-calendar__progress dawa-glass">
            <div className="dawa-calendar__progress-inner">
              <Shimmer variant="text-lg" width="60px" />
              <Shimmer variant="text-sm" width="140px" />
            </div>
            <Shimmer variant="rect" width="100%" height="8px" borderRadius="4px" />
          </div>
          {/* Event card */}
          <div className="dawa-calendar__event dawa-glass">
            <Shimmer variant="text" width="200px" />
            <Shimmer variant="text-lg" width="240px" />
            <Shimmer variant="rect" width="100%" height="60px" />
            <Shimmer variant="rect" width="100%" height="48px" />
            <Shimmer variant="rect" width="100%" height="48px" />
          </div>
        </div>
      </div>
    </div>
  );
}
