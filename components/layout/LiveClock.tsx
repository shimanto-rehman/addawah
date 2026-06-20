'use client';

import { useEffect, useState } from 'react';

type LiveClockProps = {
  className?: string;
  variant?: 'default' | 'greet';
  onTick?: (now: Date) => void;
};

function ClockDigits({ now }: { now: Date }) {
  const parts = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).formatToParts(now);

  const hour = parts.find((p) => p.type === 'hour')?.value ?? '--';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '--';
  const second = parts.find((p) => p.type === 'second')?.value ?? '--';
  const dayPeriod = parts.find((p) => p.type === 'dayPeriod')?.value ?? '';

  const date = now.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <>
      <div className="dawa-clock__digits" aria-hidden>
        <span className="dawa-clock__part">{hour}</span>
        <span className="dawa-clock__sep">:</span>
        <span className="dawa-clock__part">{minute}</span>
        <span className="dawa-clock__sep">:</span>
        <span className="dawa-clock__part dawa-clock__part--sec">{second}</span>
        {dayPeriod && <span className="dawa-clock__ampm">{dayPeriod}</span>}
      </div>
      <time className="dawa-clock__sr" dateTime={now.toISOString()}>
        {hour}:{minute}:{second} {dayPeriod}, {date}
      </time>
      <span className="dawa-clock__date">{date}</span>
    </>
  );
}

export function LiveClock({ className = '', variant = 'default', onTick }: LiveClockProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => {
      const next = new Date();
      setNow(next);
      onTick?.(next);
    }, 1000);
    return () => clearInterval(id);
  }, [onTick]);

  if (variant === 'greet') {
    return (
      <div className={`dawa-clock dawa-clock--greet${className ? ` ${className}` : ''}`}>
        <ClockDigits now={now} />
      </div>
    );
  }

  return (
    <div className={`dawa-clock${className ? ` ${className}` : ''}`}>
      <ClockDigits now={now} />
    </div>
  );
}
