/** Triggers as soon as any pixel enters view — avoids invisible content on fast scroll. */
export const VIEWPORT_EAGER = {
  once: true,
  amount: 0,
  margin: '0px 0px -60px 0px',
} as const;
