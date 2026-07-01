'use client';

import { motion } from 'framer-motion';

type BarakahScores = {
  timeScore: number;
  rizqScore: number;
  healthScore: number;
  heartScore: number;
};

type Props = {
  scores: BarakahScores;
  onChange: (scores: BarakahScores) => void;
};

const AREAS = [
  { key: 'timeScore' as const, icon: '⏰', label: 'Time', desc: 'Did your day feel blessed?' },
  { key: 'rizqScore' as const, icon: '💰', label: 'Rizq', desc: 'Did sustenance feel abundant?' },
  { key: 'healthScore' as const, icon: '💚', label: 'Health', desc: 'Did your body feel energized?' },
  { key: 'heartScore' as const, icon: '🤍', label: 'Heart', desc: 'Did your heart feel at peace?' },
];

function RingScore({ score, size = 64 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 5) * circ;

  return (
    <svg width={size} height={size} className="dawa-barakah-ring" viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--border-soft)"
        strokeWidth="4"
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--accent-bright)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circ}
        animate={{ strokeDashoffset: offset }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ filter: 'drop-shadow(0 0 4px var(--accent-glow))' }}
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--accent-bright)"
        fontFamily="var(--font-display)"
        fontWeight="700"
        fontSize="18"
      >
        {score}
      </text>
    </svg>
  );
}

export function BarakahMeter({ scores, onChange }: Props) {
  function setScore(key: keyof BarakahScores, value: number) {
    onChange({ ...scores, [key]: value });
  }

  return (
    <section className="dawa-step-card dawa-barakah-card">
      <div className="dawa-barakah-card__header">
        <h2 className="dawa-step-card__title">Barakah Meter</h2>
        <p className="dawa-step-card__subtitle">بركة</p>
      </div>

      <p className="dawa-step-card__question">
        How did barakah feel in your life today?
      </p>

      <div className="dawa-barakah-grid">
        {AREAS.map((area, ai) => (
          <motion.div
            key={area.key}
            className="dawa-barakah-area"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: ai * 0.06 }}
          >
            <span className="dawa-barakah-area__icon">{area.icon}</span>
            <RingScore score={scores[area.key]} />
            <span className="dawa-barakah-area__label">{area.label}</span>
            <span className="dawa-barakah-area__desc">{area.desc}</span>
            <div className="dawa-barakah-dots">
              {[1, 2, 3, 4, 5].map((s) => (
                <motion.button
                  key={s}
                  type="button"
                  className={`dawa-barakah-dot${scores[area.key] >= s ? ' is-filled' : ''}`}
                  onClick={() => setScore(area.key, s)}
                  whileTap={{ scale: 0.85 }}
                  aria-label={`${area.label} ${s}`}
                />
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
