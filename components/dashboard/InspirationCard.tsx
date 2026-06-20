'use client';

import { getDailyInspiration } from '@/lib/constants';

export function InspirationCard() {
  const inspiration = getDailyInspiration();

  return (
    <div className="dawa-quote">
      <span className="dawa-quote__watermark" aria-hidden>﷽</span>
      <p className="dawa-quote__tag">Daily Inspiration</p>
      <p className="dawa-quote__text">&ldquo;{inspiration.text}&rdquo;</p>
      <p className="dawa-quote__ref">— {inspiration.ref}</p>
    </div>
  );
}
