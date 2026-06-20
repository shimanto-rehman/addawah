'use client';

import { getGregorianLabel, toHijri } from '@/lib/salah-utils';

export function HijriCalendar() {
  const hijri = toHijri();
  const gregorian = getGregorianLabel();

  return (
    <div className="dawa-hijri">
      <div className="dawa-hijri__bismillah">ٱلتَّقْوِيمُ ٱلْهِجْرِيُّ</div>
      <div className="dawa-hijri__date">{hijri.formatted}</div>
      <div className="dawa-hijri__greg">{gregorian}</div>
    </div>
  );
}
