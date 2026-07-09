'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { useApp } from '@/components/providers/AppProvider';
import { swrFetcher } from '@/lib/swr-fetcher';
import { CALENDAR_KEY } from '@/lib/swr-revalidate';
import { Shimmer } from '@/components/ui/Shimmer';
import type { CalendarPayload, IslamicEvent, IslamicHistoricalEvent } from '@/lib/islamic-calendar';

const EASE = [0.22, 1, 0.36, 1] as const;

const SIGNIFICANCE_DOT: Record<string, string> = {
  high: '🔴',
  medium: '🟡',
  low: '⚪',
};

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

export function IslamicCalendar() {
  const { user, loading } = useApp();
  const { data, isLoading, mutate } = useSWR<CalendarPayload>(
    user && !loading ? CALENDAR_KEY : null,
    swrFetcher,
  );

  const [toggling, setToggling] = useState<string | null>(null);
  const [coinsToast, setCoinsToast] = useState<number | null>(null);

  const toggle = useCallback(
    async (eventId: string, actionIndex: number) => {
      const key = `${eventId}:${actionIndex}`;
      setToggling(key);

      // Optimistic update: flip the bit in the mask
      const optimistic = data ? { ...data } : null;
      if (optimistic) {
        let bitOffset = 0;
        for (const ev of optimistic.today.events) {
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
        // Rollback on error
        await mutate();
      } finally {
        setToggling(null);
      }
    },
    [data, mutate],
  );

  if (isLoading || !data) return <CalendarShimmer />;

  const hasEvents = data.today.events.length > 0;
  const totalActions = data.today.totalCount;
  const completedActions = data.today.completedCount;
  const progressPct = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;

  return (
    <div className="dawa-calendar">
      {/* Coins earned toast */}
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

      {/* Two-column layout: left = calendar + history, right = events + countdown */}
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
                {data.nextEvent.event.title}
              </h3>
              <p className="dawa-calendar__countdown-arabic">
                {data.nextEvent.event.arabicTitle}
              </p>
              <p className="dawa-calendar__countdown-target">{data.nextEvent.hijriDateTarget}</p>
            </motion.section>
          )}

          {/* Month grid */}
          <motion.section
            className="dawa-calendar__month dawa-glass"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
            aria-label="Islamic calendar month view"
          >
            <div className="dawa-calendar__month-grid">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <span key={i} className="dawa-calendar__dow">{d}</span>
              ))}
              {data.monthGrid.map((cell) => (
                <div
                  key={cell.dateKey}
                  className={[
                    'dawa-calendar__cell',
                    cell.isToday ? ' is-today' : '',
                    cell.hasEvent ? ' has-event' : '',
                    cell.significance === 'high' ? ' sig-high' : '',
                    cell.significance === 'medium' ? ' sig-medium' : '',
                  ].join('')}
                  title={cell.eventTitles.join(', ')}
                >
                  <span className="dawa-calendar__cell-greg">{cell.gregorianDay}</span>
                  <span className="dawa-calendar__cell-hijri dawa-num">{cell.hijriDay}</span>
                  {cell.hasEvent && (
                    <span className="dawa-calendar__cell-dot" aria-hidden>
                      {SIGNIFICANCE_DOT[cell.significance ?? 'low']}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </motion.section>

          {/* On This Day in Islamic History */}
          {data.todayHistory.length > 0 && (
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
                {data.todayHistory.map((hist, i) => (
                  <HistoryCard key={hist.id} event={hist} delay={0.2 + i * 0.08} />
                ))}
              </div>
            </motion.section>
          )}
        </div>

        {/* === RIGHT COLUMN === */}
        <div className="dawa-calendar__col-right">
          {/* Progress summary */}
          {totalActions > 0 && (
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

          {/* Today's events: story + checklist */}
          {hasEvents ? (
            data.today.events.map((ev, evIdx) => (
              <EventCard
                key={ev.id}
                event={ev}
                mask={data.today.mask}
                eventsBefore={data.today.events.slice(0, evIdx)}
                toggle={toggle}
                toggling={toggling}
                delay={0.2 + evIdx * 0.1}
              />
            ))
          ) : (
            <motion.section
              className="dawa-calendar__no-events dawa-glass"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
            >
              <div className="dawa-calendar__no-events-icon">🌙</div>
              <p className="dawa-calendar__no-events-text">
                No special Islamic event today. Keep up your daily salah and adhkar —
                every ordinary day is an opportunity for extraordinary reward.
              </p>
              <p className="dawa-calendar__no-events-hint">
                💡 Try fasting on the White Days (13th–15th of each Hijri month) or on
                Mondays and Thursdays — a beautiful sunnah of the Prophet ﷺ.
              </p>
            </motion.section>
          )}
        </div>
      </div>
    </div>
  );
}

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
  mask,
  eventsBefore,
  toggle,
  toggling,
  delay,
}: {
  event: IslamicEvent;
  mask: number;
  eventsBefore: IslamicEvent[];
  toggle: (eventId: string, actionIndex: number) => void;
  toggling: string | null;
  delay: number;
}) {
  const bitOffset = useMemo(
    () => eventsBefore.reduce((sum, e) => sum + e.sunnahActions.length, 0),
    [eventsBefore],
  );

  return (
    <motion.section
      className="dawa-calendar__event dawa-glass"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: EASE }}
    >
      <header className="dawa-calendar__event-head">
        <span className="dawa-calendar__event-cat">
          {CATEGORY_LABELS[event.category] ?? event.category}
        </span>
        <h2 className="dawa-calendar__event-title">{event.title}</h2>
        <p className="dawa-calendar__event-arabic">{event.arabicTitle}</p>
      </header>

      {/* Story */}
      <div className="dawa-calendar__story">
        <p className="dawa-calendar__story-text">{event.shortStory}</p>
      </div>

      {/* Quran references */}
      {event.quranRefs.length > 0 && (
        <div className="dawa-calendar__refs">
          <span className="dawa-calendar__refs-label">📖 Quran references</span>
          <div className="dawa-calendar__refs-list">
            {event.quranRefs.map((ref, i) => (
              <a
                key={i}
                href={`https://quran.com/${ref.surahNumber}:${ref.ayah}`}
                target="_blank"
                rel="noopener noreferrer"
                className="dawa-calendar__ref-chip"
              >
                {ref.surah} {ref.surahNumber}:{ref.ayah}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Sunnah checklist */}
      <div className="dawa-calendar__plan">
        <h3 className="dawa-calendar__plan-title">Plan of the day</h3>
        <ul className="dawa-calendar__checklist">
          {event.sunnahActions.map((action, i) => {
            const bitIndex = bitOffset + i;
            const done = isActionDone(mask, bitIndex);
            const key = `${event.id}:${i}`;
            const isToggling = toggling === key;
            return (
              <li key={i}>
                <button
                  type="button"
                  className={`dawa-calendar__action${done ? ' is-done' : ''}`}
                  aria-pressed={done}
                  disabled={toggling !== null && toggling !== key}
                  onClick={() => toggle(event.id, i)}
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
                  {isToggling && <span className="dawa-calendar__action-spinner" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

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

function CalendarShimmer() {
  return (
    <div className="dawa-calendar dawa-calendar--loading">
      <div className="dawa-calendar__grid">
        <div className="dawa-calendar__col-left">
          <div className="dawa-calendar__countdown dawa-glass">
            <Shimmer variant="text-sm" width="120px" />
            <Shimmer variant="text" width="200px" />
          </div>
          <div className="dawa-calendar__month dawa-glass">
            <div className="dawa-calendar__month-grid">
              {Array.from({ length: 35 }, (_, i) => (
                <Shimmer key={i} variant="rect" width="100%" height="36px" borderRadius="8px" />
              ))}
            </div>
          </div>
        </div>
        <div className="dawa-calendar__col-right">
          <div className="dawa-calendar__event dawa-glass">
            <Shimmer variant="text" width="120px" />
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
