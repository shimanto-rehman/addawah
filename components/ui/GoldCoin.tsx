'use client';

import { useId } from 'react';

type GoldCoinProps = {
  size?: number;
  className?: string;
};

export function GoldCoin({ size = 20, className = '' }: GoldCoinProps) {
  const uid = useId().replace(/:/g, '');
  const faceId = `coin-face-${uid}`;
  const rimId = `coin-rim-${uid}`;
  const shineId = `coin-shine-${uid}`;
  const innerId = `coin-inner-${uid}`;

  return (
    <span
      className={`dawa-gold-coin${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="15" fill={`url(#${rimId})`} />
        <circle cx="16" cy="16" r="13.5" fill={`url(#${faceId})`} />
        <circle cx="16" cy="16" r="13.5" stroke="rgba(90,58,8,0.35)" strokeWidth="0.5" />
        <ellipse cx="12" cy="11" rx="6" ry="4.5" fill={`url(#${shineId})`} opacity="0.55" />
        <circle cx="16" cy="16" r="10.5" fill="none" stroke="rgba(255,235,160,0.35)" strokeWidth="0.6" />
        <circle cx="16" cy="16" r="9.2" fill="none" stroke="rgba(120,78,12,0.45)" strokeWidth="0.45" />
        <circle cx="16" cy="16" r="7.8" fill={`url(#${innerId})`} stroke="rgba(180,130,20,0.5)" strokeWidth="0.4" />
        <path
          d="M16 11.2l1.1 2.3 2.5.4-1.8 1.8.4 2.5-2.2-1.2-2.2 1.2.4-2.5-1.8-1.8 2.5-.4L16 11.2z"
          fill="rgba(120,78,8,0.55)"
        />
        <circle cx="16" cy="16" r="15" fill="none" stroke="rgba(255,240,180,0.25)" strokeWidth="0.35" strokeDasharray="1.2 1.8" />
        <defs>
          <radialGradient id={faceId} cx="38%" cy="32%" r="68%">
            <stop offset="0%" stopColor="#fff4b8" />
            <stop offset="35%" stopColor="#ffd84a" />
            <stop offset="72%" stopColor="#e5a812" />
            <stop offset="100%" stopColor="#9a7010" />
          </radialGradient>
          <linearGradient id={rimId} x1="8" y1="4" x2="26" y2="28">
            <stop stopColor="#c9981a" />
            <stop offset="0.5" stopColor="#f5d042" />
            <stop offset="1" stopColor="#8a6510" />
          </linearGradient>
          <radialGradient id={shineId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={innerId} cx="45%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#ffe566" />
            <stop offset="100%" stopColor="#d4a017" />
          </radialGradient>
        </defs>
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
