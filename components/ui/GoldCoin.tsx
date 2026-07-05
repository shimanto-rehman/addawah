'use client';

import { GOLD_COIN_SRC } from '@/lib/constants';

type GoldCoinProps = {
  size?: number;
  className?: string;
};

export function GoldCoin({ size = 20, className = '' }: GoldCoinProps) {
  return (
    <span
      className={`dawa-gold-coin${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <img src={GOLD_COIN_SRC} alt="" width={size} height={size} draggable={false} />
    </span>
  );
}

export function GoldCoinAmount({ amount, size = 16 }: { amount: number; size?: number }) {
  return (
    <span className="dawa-gold-coin-amount">
      <GoldCoin size={size} />
      <span className="dawa-num">{amount}</span>
    </span>
  );
}
