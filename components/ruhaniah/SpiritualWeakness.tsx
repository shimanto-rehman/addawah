'use client';

import { motion } from 'framer-motion';
import type { Weakness } from '@/lib/ruhaniah-weakness';

type Props = {
  weaknesses: Weakness[];
};

const severityColors: Record<string, { bg: string; border: string; label: string }> = {
  critical: {
    bg: 'var(--severity-critical-bg, color-mix(in srgb, #ef4444 12%, var(--surface-2)))',
    border: 'var(--severity-critical-border, color-mix(in srgb, #ef4444 30%, var(--border)))',
    label: 'Urgent',
  },
  high: {
    bg: 'var(--severity-high-bg, color-mix(in srgb, #f59e0b 12%, var(--surface-2)))',
    border: 'var(--severity-high-border, color-mix(in srgb, #f59e0b 30%, var(--border)))',
    label: 'Important',
  },
  moderate: {
    bg: 'var(--severity-moderate-bg, color-mix(in srgb, #6366f1 10%, var(--surface-2)))',
    border: 'var(--severity-moderate-border, color-mix(in srgb, #6366f1 25%, var(--border)))',
    label: 'Reflect',
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.2 + i * 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

export function SpiritualWeakness({ weaknesses }: Props) {
  if (!weaknesses || weaknesses.length === 0) return null;

  return (
    <motion.div
      className="dawa-weakness"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.5 }}
    >
      <div className="dawa-weakness__header">
        <p className="dawa-weakness__label">Where Your Deen Needs Attention</p>
        <p className="dawa-weakness__subtitle">
          Based on your salah, psychometric analysis, taqwa, barakah, and spiritual state
        </p>
      </div>

      <div className="dawa-weakness__list">
        {weaknesses.map((w, i) => {
          const style = severityColors[w.severity] || severityColors.moderate;
          return (
            <motion.div
              key={w.id}
              className="dawa-weakness__card"
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              style={{
                background: style.bg,
                borderColor: style.border,
              }}
            >
              <div className="dawa-weakness__card-head">
                <span className="dawa-weakness__icon">{w.icon}</span>
                <div className="dawa-weakness__card-titles">
                  <h3 className="dawa-weakness__title">{w.title}</h3>
                  <span className="dawa-weakness__arabic">{w.arabicTitle}</span>
                </div>
                <span
                  className="dawa-weakness__badge"
                  style={{ background: style.border }}
                >
                  {style.label}
                </span>
              </div>

              <p className="dawa-weakness__desc">{w.description}</p>

              <div className="dawa-weakness__advice">
                <p className="dawa-weakness__advice-label">What to do</p>
                <p className="dawa-weakness__advice-text">{w.advice}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
