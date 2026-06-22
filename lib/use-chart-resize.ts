'use client';

import { useEffect, type RefObject } from 'react';
import { Chart as ChartJS } from 'chart.js';

const CHART_SLOT =
  '.dawa-analytics__chart, .dawa-insights__chart, .dawa-insights__chart--area';

function resizeCharts(root: HTMLElement) {
  root.querySelectorAll('canvas').forEach((canvas) => {
    ChartJS.getChart(canvas)?.resize();
  });
}

/** Keeps Chart.js canvases in sync when grid/flex layout reflows. */
export function useChartResize(
  rootRef: RefObject<HTMLElement | null>,
  deps: unknown[] = [],
) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === 'undefined') return;

    const onResize = () => resizeCharts(root);
    const ro = new ResizeObserver(onResize);
    ro.observe(root);
    root.querySelectorAll(CHART_SLOT).forEach((el) => ro.observe(el));

    window.addEventListener('orientationchange', onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener('orientationchange', onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
