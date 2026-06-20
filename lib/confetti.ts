export type ConfettiOptions = {
  particleCount?: number;
  angle?: number;
  spread?: number;
  startVelocity?: number;
  origin?: { x: number; y: number };
};

declare global {
  interface Window {
    confetti?: ((options?: ConfettiOptions) => Promise<void>) & { reset?: () => void };
  }
}

/** Same dual-burst celebration used on shimanto.nextjs home page. */
export function fireCelebrationConfetti() {
  if (typeof window === 'undefined' || typeof window.confetti !== 'function') return;

  window.confetti({
    particleCount: 300,
    angle: 60,
    spread: 100,
    startVelocity: 90,
    origin: { x: -0.1, y: 1.1 },
  });

  window.confetti({
    particleCount: 300,
    angle: 120,
    spread: 100,
    startVelocity: 90,
    origin: { x: 1.1, y: 1.1 },
  });
}
