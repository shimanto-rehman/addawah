'use client';

import { useId } from 'react';

type GoldCoinProps = {
  size?: number;
  className?: string;
};

const RAYS = Array.from({ length: 24 }, (_, i) => {
  const angle = (i * 360) / 24;
  const rad = (angle * Math.PI) / 180;
  const inner = 4.2;
  const outer = 12.8;
  const x1 = 16 + Math.cos(rad) * inner;
  const y1 = 16 + Math.sin(rad) * inner;
  const x2 = 16 + Math.cos(rad) * outer;
  const y2 = 16 + Math.sin(rad) * outer;
  return { x1, y1, x2, y2, opacity: i % 2 === 0 ? 0.42 : 0.22 };
});

export function GoldCoin({ size = 20, className = '' }: GoldCoinProps) {
  const uid = useId().replace(/:/g, '');
  const faceId = `coin-face-${uid}`;
  const rimId = `coin-rim-${uid}`;
  const rimInnerId = `coin-rim-inner-${uid}`;
  const shineId = `coin-shine-${uid}`;
  const shadowId = `coin-shadow-${uid}`;
  const leafId = `coin-leaf-${uid}`;

  return (
    <span
      className={`dawa-gold-coin${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1.8" stdDeviation="1.2" floodColor="#5a3a08" floodOpacity="0.45" />
            <feDropShadow dx="0" dy="0.4" stdDeviation="0.3" floodColor="#fff8d0" floodOpacity="0.35" />
          </filter>
          <radialGradient id={faceId} cx="42%" cy="36%" r="62%">
            <stop offset="0%" stopColor="#fff9d4" />
            <stop offset="18%" stopColor="#ffe566" />
            <stop offset="45%" stopColor="#f0c030" />
            <stop offset="72%" stopColor="#c98a12" />
            <stop offset="100%" stopColor="#7a5508" />
          </radialGradient>
          <linearGradient id={rimId} x1="6" y1="4" x2="28" y2="28">
            <stop offset="0%" stopColor="#f8e08a" />
            <stop offset="22%" stopColor="#d4a017" />
            <stop offset="50%" stopColor="#ffe97a" />
            <stop offset="78%" stopColor="#b8860b" />
            <stop offset="100%" stopColor="#6b4a08" />
          </linearGradient>
          <linearGradient id={rimInnerId} x1="10" y1="8" x2="24" y2="26">
            <stop offset="0%" stopColor="#8a6510" />
            <stop offset="50%" stopColor="#c9981a" />
            <stop offset="100%" stopColor="#5a3f08" />
          </linearGradient>
          <radialGradient id={shineId} cx="36%" cy="28%" r="48%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.92" />
            <stop offset="55%" stopColor="#fff4b0" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={leafId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e8c040" />
            <stop offset="100%" stopColor="#9a7010" />
          </linearGradient>
        </defs>

        <g filter={`url(#${shadowId})`}>
          <circle cx="16" cy="16" r="15.2" fill={`url(#${rimId})`} />
          <circle cx="16" cy="16" r="14.2" fill="none" stroke={`url(#${rimInnerId})`} strokeWidth="0.7" />
          <circle cx="16" cy="16" r="12.6" fill={`url(#${faceId})`} />
        </g>

        <g opacity="0.55">
          {RAYS.map((ray, i) => (
            <line
              key={i}
              x1={ray.x1}
              y1={ray.y1}
              x2={ray.x2}
              y2={ray.y2}
              stroke="#8a6510"
              strokeWidth="0.35"
              strokeLinecap="round"
              opacity={ray.opacity}
            />
          ))}
        </g>

        <circle cx="16" cy="16" r="12.6" fill="none" stroke="rgba(255,240,180,0.28)" strokeWidth="0.45" />
        <circle cx="16" cy="16" r="11.2" fill="none" stroke="rgba(90,58,8,0.35)" strokeWidth="0.35" />

        <g fill={`url(#${leafId})`} stroke="rgba(70,45,6,0.45)" strokeWidth="0.25">
          <path d="M8.2 18.5c1.2-3.8 2.8-6.2 4.6-7.8 0.8 1.6 1 3.4 0.5 5.4-1.8 0.6-3.4 1.4-5.1 2.4z" />
          <path d="M9.4 16.2c1.4-2.2 2.6-3.4 3.8-4 0.3 1.2 0.2 2.3-0.2 3.4-1.2 0.2-2.4 0.4-3.6 0.6z" />
          <path d="M10.8 13.8c1-1.4 1.8-2.1 2.6-2.4 0.1 0.8 0 1.5-0.3 2.2-0.9 0.1-1.7 0.15-2.3 0.2z" />
          <path d="M23.8 18.5c-1.2-3.8-2.8-6.2-4.6-7.8-0.8 1.6-1 3.4-0.5 5.4 1.8 0.6 3.4 1.4 5.1 2.4z" />
          <path d="M22.6 16.2c-1.4-2.2-2.6-3.4-3.8-4-0.3 1.2-0.2 2.3 0.2 3.4 1.2 0.2 2.4 0.4 3.6 0.6z" />
          <path d="M21.2 13.8c-1-1.4-1.8-2.1-2.6-2.4-0.1 0.8 0 1.5 0.3 2.2 0.9 0.1 1.7 0.15 2.3 0.2z" />
        </g>

        <g fill="rgba(120,78,8,0.7)">
          <circle cx="13.2" cy="21.2" r="0.55" />
          <circle cx="14.8" cy="21.8" r="0.55" />
          <circle cx="16" cy="22.1" r="0.6" />
          <circle cx="17.2" cy="21.8" r="0.55" />
          <circle cx="18.8" cy="21.2" r="0.55" />
        </g>

        <ellipse cx="11.5" cy="10.5" rx="7" ry="5.5" fill={`url(#${shineId})`} />
        <path
          d="M16 4.8a11.2 11.2 0 0 1 0 22.4"
          fill="none"
          stroke="rgba(255,248,200,0.45)"
          strokeWidth="0.55"
          strokeLinecap="round"
        />
        <path
          d="M16 27.2a11.2 11.2 0 0 1 0-22.4"
          fill="none"
          stroke="rgba(60,38,6,0.35)"
          strokeWidth="0.5"
          strokeLinecap="round"
        />
        <circle cx="16" cy="16" r="15.2" fill="none" stroke="rgba(255,235,160,0.22)" strokeWidth="0.4" />
      </svg>
    </span>
  );
}

export function GoldCoinAmount({ amount, size = 16 }: { amount: number; size?: number }) {
  return (
    <span className="dawa-gold-coin-amount">
      <GoldCoin size={size} />
      <span>{amount}</span>
    </span>
  );
}
