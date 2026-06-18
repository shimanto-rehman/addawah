'use client';

import { motion } from 'framer-motion';
import { getDailyInspiration } from '@/lib/constants';

export function InspirationCard() {
  const inspiration = getDailyInspiration();

  return (
    <motion.div
      className="dawa-quote"
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.55, delay: 0.2 }}
    >
      <span className="dawa-quote__watermark" aria-hidden>﷽</span>
      <p className="dawa-quote__tag">Daily Inspiration</p>
      <p className="dawa-quote__text">&ldquo;{inspiration.text}&rdquo;</p>
      <p className="dawa-quote__ref">— {inspiration.ref}</p>
    </motion.div>
  );
}
