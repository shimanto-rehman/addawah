'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { chartTheme, accentRgba } from '@/lib/chart-theme';

type Props = {
  score: number | null;
  onChange: (score: number) => void;
};

const LABELS: { arabic: string; en: string }[] = [
  { arabic: 'غفلة', en: 'Ghaflah — Heedlessness' },
  { arabic: 'سهو', en: 'Sahw — Distracted' },
  { arabic: 'توجّه', en: 'Tawajjuh — Turning Attention' },
  { arabic: 'حضور', en: 'Hudhur — Presence of Heart' },
  { arabic: 'إحسان', en: 'Ihsan — Excellence in Worship' },
];

const GLOW_ALPHA = [0.0, 0.15, 0.3, 0.55, 0.85];

// Breathing speed: higher score = faster, more alive
const BREATHE_DUR = ['3s', '3.5s', '2.8s', '2.2s', '1.6s'];

// Particle config per score level
const PARTICLE_CONFIG = [
  { count: 0, dur: 4 },
  { count: 3, dur: 3.5 },
  { count: 4, dur: 3 },
  { count: 5, dur: 2.8 },
  { count: 7, dur: 2.2 },
];

export function TaqwaPulse({ score, onChange }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const theme = chartTheme();
  const current = score ?? 0;
  const glows = useMemo(() => GLOW_ALPHA.map((a) => accentRgba(theme, a)), [theme]);
  const posToScore = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return current;
      const rect = track.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Math.round(pct * 4) + 1;
    },
    [current],
  );

  const handleChange = useCallback(
    (next: number) => {
      if (next !== current) {
        setBurstKey((k) => k + 1);
        onChange(next);
      }
    },
    [current, onChange],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDragging(true);
      handleChange(posToScore(e.clientX));
    },
    [posToScore, handleChange],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      handleChange(posToScore(e.clientX));
    },
    [dragging, posToScore, handleChange],
  );

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  const pct = current > 0 ? ((current - 1) / 4) * 100 : 0;
  const isActive = current > 0;
  const isHigh = current >= 4;
  const particleCfg = PARTICLE_CONFIG[current] || PARTICLE_CONFIG[0];

  // Pre-compute particle positions so they don't jump on re-render
  const particles = useMemo(
    () =>
      Array.from({ length: particleCfg.count }, (_, i) => ({
        id: i,
        left: 15 + ((i * 37 + 13) % 70), // pseudo-random spread 15-85%
        delay: (i * 0.45) % particleCfg.dur,
        dur: particleCfg.dur + (i % 3) * 0.3,
      })),
    [particleCfg.count, particleCfg.dur],
  );

  return (
    <section className="dawa-step-card dawa-taqwa-card">
      <div className="dawa-taqwa-card__header">
        <h2 className="dawa-step-card__title">Taqwa Pulse</h2>
        <p className="dawa-step-card__subtitle">تقوى</p>
      </div>

      <p className="dawa-step-card__question">
        Right now, how aware are you of Allah?
      </p>

      {/* Orb + aura + particles */}
      <div
        className={`dawa-taqwa-orb-wrap${isActive ? ' is-active' : ''}`}
        style={{ '--taqwa-breathe-dur': BREATHE_DUR[current] } as React.CSSProperties}
      >
        {/* Core glow */}
        <motion.div
          className="dawa-taqwa-orb"
          animate={{
            scale: isActive ? 0.85 + current * 0.1 : 0.8,
            opacity: isActive ? 0.4 + current * 0.12 : 0.3,
          }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          style={{
            background: `radial-gradient(circle, ${glows[current]} 0%, transparent 70%)`,
          }}
        />

        {/* Burst flash on score change */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              key={burstKey}
              className="dawa-taqwa-burst"
              initial={{ scale: 0.4, opacity: 0.8 }}
              animate={{ scale: 1.8, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>

        {/* Floating particles */}
        {isActive && (
          <div className="dawa-taqwa-particles">
            {particles.map((p) => (
              <span
                key={p.id}
                className="dawa-taqwa-particle"
                style={{
                  left: `${p.left}%`,
                  bottom: '20%',
                  '--taqwa-particle-dur': `${p.dur}s`,
                  '--taqwa-particle-delay': `${p.delay}s`,
                } as React.CSSProperties}
              />
            ))}
          </div>
        )}

        {/* Number */}
        <motion.span
          className="dawa-taqwa-orb__num"
          key={current}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          {current > 0 ? current : '0'}
        </motion.span>
      </div>

      {/* Slider track */}
      <div
        ref={trackRef}
        className={`dawa-taqwa-track${isHigh ? ' is-high' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        role="slider"
        aria-valuemin={1}
        aria-valuemax={5}
        aria-valuenow={current || undefined}
        aria-label="Taqwa awareness level"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp')
            handleChange(Math.min(5, (current || 0) + 1));
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown')
            handleChange(Math.max(1, (current || 1) - 1));
        }}
      >
        <div className="dawa-taqwa-track__bg" />

        <motion.div
          className="dawa-taqwa-track__fill"
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />

        {[0, 25, 50, 75, 100].map((tickPct, i) => (
          <div
            key={i}
            className={`dawa-taqwa-track__tick${current >= i + 1 ? ' is-active' : ''}`}
            style={{ left: `${tickPct}%` }}
          >
            <span className="dawa-taqwa-track__tick-num">{i + 1}</span>
          </div>
        ))}

        {isActive && (
          <motion.div
            className="dawa-taqwa-track__thumb"
            animate={{ left: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{
              boxShadow: `0 0 ${8 + current * 4}px ${glows[current]}, 0 2px 8px rgba(0,0,0,0.3)`,
            }}
          />
        )}
      </div>

      {/* Label or hint */}
      <AnimatePresence mode="wait">
        {isActive ? (
          <motion.div
            className="dawa-taqwa-label"
            key={current}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
          >
            <span className="dawa-taqwa-label__arabic">{LABELS[current - 1].arabic}</span>
            <span className="dawa-taqwa-label__en">{LABELS[current - 1].en}</span>
          </motion.div>
        ) : (
          <motion.p
            className="dawa-taqwa-hint"
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            Slide to set your taqwa
          </motion.p>
        )}
      </AnimatePresence>
    </section>
  );
}
