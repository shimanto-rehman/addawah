'use client';

import { motion } from 'framer-motion';
import { getGregorianLabel, toHijri } from '@/lib/salah-utils';

export function HijriCalendar() {
  const hijri = toHijri();
  const gregorian = getGregorianLabel();

  return (
    <motion.div
      className="dawa-hijri"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.15 }}
    >
      <div className="dawa-hijri__bismillah">ٱلتَّقْوِيمُ ٱلْهِجْرِيُّ</div>
      <div className="dawa-hijri__date">{hijri.formatted}</div>
      <div className="dawa-hijri__greg">{gregorian}</div>
    </motion.div>
  );
}
