'use client';

import { useEffect, useRef } from 'react';

/**
 * Replicates cocoon-template-1.0.1's "Gradient Scroll Animation" (js/main.js):
 * a wrap expands from `baseMaxWidth` toward 100vw, and its inner box's
 * border-radius shrinks to 0, as the element travels from entering the
 * viewport (from below) to reaching the viewport top.
 *
 * All GradientWrap instances on a page share ONE scroll/resize listener and
 * ONE requestAnimationFrame loop (module-level registry below) instead of
 * one each — reads are batched before writes every frame so scrolling never
 * triggers layout thrash (which otherwise shows up as jank on anything
 * `position: fixed`, like the nav bar, sitting above the animating content).
 */

type Entry = {
  wrap: HTMLDivElement;
  box: HTMLDivElement;
  baseMaxWidth: number;
  baseRadius: number;
};

let entries: Entry[] = [];
let rafId = 0;
let bound = false;

function tick() {
  rafId = 0;
  if (!entries.length) return;

  const scrollY = window.scrollY || window.pageYOffset;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Batch all reads first (forces one layout pass), then all writes.
  const tops = entries.map((e) => e.wrap.getBoundingClientRect().top + scrollY);

  entries.forEach((e, i) => {
    const elTop = tops[i];
    const startScroll = Math.max(0, elTop - vh);
    const endScroll = elTop;
    const range = endScroll - startScroll;
    if (range <= 0) return;

    const progress = Math.min(1, Math.max(0, (scrollY - startScroll) / range));
    const currentMaxWidth = e.baseMaxWidth + (vw - e.baseMaxWidth) * progress;
    e.wrap.style.maxWidth = `${currentMaxWidth}px`;
    e.box.style.borderRadius = `${(1 - progress) * e.baseRadius}px`;
  });
}

function schedule() {
  if (rafId) return;
  rafId = requestAnimationFrame(tick);
}

function bindGlobalListeners() {
  if (bound) return;
  bound = true;
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
}

function unbindGlobalListenersIfIdle() {
  if (bound && entries.length === 0) {
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    bound = false;
  }
}

export function useGradientExpand(baseMaxWidth = 1152, baseRadius = 28) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const box = boxRef.current;
    if (!wrap || !box) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const entry: Entry = { wrap, box, baseMaxWidth, baseRadius };
    entries.push(entry);
    bindGlobalListeners();
    schedule();

    return () => {
      entries = entries.filter((e) => e !== entry);
      unbindGlobalListenersIfIdle();
    };
  }, [baseMaxWidth, baseRadius]);

  return { wrapRef, boxRef };
}
