'use client';

import { useEffect } from 'react';

/** Calls `onMidnight` when the local calendar day rolls over. */
export function useMidnightRefresh(onMidnight: () => void) {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    function arm() {
      const now = new Date();
      const next = new Date(now);
      next.setHours(0, 0, 0, 0);
      next.setDate(next.getDate() + 1);
      const delay = Math.max(100, next.getTime() - now.getTime() + 50);

      timer = setTimeout(() => {
        onMidnight();
        arm();
      }, delay);
    }

    arm();
    return () => clearTimeout(timer);
  }, [onMidnight]);
}
