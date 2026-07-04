'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { GoldCoinAmount } from '@/components/ui/GoldCoin';
import { UserProfileLink } from '@/components/friends/UserProfileLink';
import type { PrayerName } from '@/lib/constants';
import type { FriendWaktPhase } from '@/lib/friends-wakt';
import { formatCountdownHms } from '@/lib/wakt-display';

export type BoardBadge = {
  id: string;
  name: string;
  minCoins: number;
  icon: string;
  blurb: string;
};

export type BoardRow = {
  id: string;
  name: string;
  username: string | null;
  avatarColor: string;
  avatarUrl?: string | null;
  goldCoins: number;
  goldCoinsHidden?: boolean;
  badge: BoardBadge | null;
  wakt: {
    prayer: PrayerName | null;
    prayerLabel: string;
    phase: FriendWaktPhase;
    salahStatus: string;
    waktStartedAt: string | null;
    waktEndsAt: string | null;
    waktEndLabel: string | null;
    canPoke: boolean;
    pokeCooldownUntil?: string | null;
    pokeCooldownSeconds?: number;
    forbiddenNow: boolean;
    elapsedMinutes: number;
    remainingMinutes: number;
    elapsedSeconds: number;
    remainingSeconds: number;
    isPrivate?: boolean;
  };
};

const ROW_HEIGHT = 76;

function useWaktCountdown(wakt: BoardRow['wakt']) {
  const [remainingSeconds, setRemainingSeconds] = useState(wakt.remainingSeconds);

  useEffect(() => {
    if (wakt.phase === 'upcoming') {
      const startMs = wakt.waktStartedAt ? new Date(wakt.waktStartedAt).getTime() : null;
      if (!startMs) {
        setRemainingSeconds(wakt.remainingSeconds);
        return;
      }
      const tick = () => setRemainingSeconds(Math.max(0, Math.floor((startMs - Date.now()) / 1000)));
      tick();
      const id = setInterval(tick, 1000);
      return () => clearInterval(id);
    }

    if (wakt.phase !== 'active' || !wakt.waktEndsAt) {
      setRemainingSeconds(wakt.remainingSeconds);
      return;
    }

    const endMs = new Date(wakt.waktEndsAt).getTime();
    const tick = () => setRemainingSeconds(Math.max(0, Math.floor((endMs - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [wakt.phase, wakt.waktEndsAt, wakt.waktStartedAt, wakt.remainingSeconds]);

  return remainingSeconds;
}

function usePokeCooldown(wakt: BoardRow['wakt'], onExpired?: () => void) {
  const [remainingSeconds, setRemainingSeconds] = useState(wakt.pokeCooldownSeconds ?? 0);

  useEffect(() => {
    const initial = wakt.pokeCooldownSeconds ?? 0;
    if (initial <= 0 || !wakt.pokeCooldownUntil) {
      setRemainingSeconds(0);
      return;
    }

    const untilMs = new Date(wakt.pokeCooldownUntil).getTime();
    const tick = () => {
      const next = Math.max(0, Math.ceil((untilMs - Date.now()) / 1000));
      setRemainingSeconds(next);
      if (next === 0) onExpired?.();
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [wakt.pokeCooldownSeconds, wakt.pokeCooldownUntil, onExpired]);

  return remainingSeconds;
}

function PokeActionCell({
  row,
  pokeBusy,
  onPoke,
  onCooldownEnd,
}: {
  row: BoardRow;
  pokeBusy: boolean;
  onPoke: (row: BoardRow) => void;
  onCooldownEnd: () => void;
}) {
  const { wakt } = row;
  const cooldownSeconds = usePokeCooldown(wakt, onCooldownEnd);

  if (wakt.canPoke) {
    return (
      <button type="button" className="dawa-poke" disabled={pokeBusy} onClick={() => onPoke(row)}>
        {pokeBusy ? '…' : 'Poke 🤲'}
      </button>
    );
  }

  if (cooldownSeconds > 0) {
    return (
      <span className="dawa-social-board__muted" title="Poke cooldown">
        <span className="dawa-num">{formatCountdownHms(cooldownSeconds)}</span>
      </span>
    );
  }

  if (wakt.forbiddenNow && wakt.phase === 'active' && wakt.salahStatus === 'pending') {
    return (
      <span className="dawa-social-board__muted" title="Forbidden time">
        Wait
      </span>
    );
  }

  if (wakt.salahStatus === 'on-time' || wakt.phase === 'prayed') {
    return <span className="dawa-social-board__done">Prayed ✓</span>;
  }

  return <span className="dawa-social-board__muted">—</span>;
}

function WaktStatusCell({ row }: { row: BoardRow }) {
  const { wakt } = row;
  const remainingSeconds = useWaktCountdown(wakt);
  const isLowTime = remainingSeconds <= 5 * 60;
  const countdownClass = `dawa-social-board__timer dawa-social-board__timer--countdown${
    isLowTime ? ' dawa-social-board__timer--danger' : ''
  }`;

  if (wakt.isPrivate) {
    return <span className="dawa-social-board__status dawa-social-board__status--private">Private</span>;
  }

  if (wakt.phase === 'prayed' || wakt.salahStatus === 'on-time') {
    return <span className="dawa-social-board__status dawa-social-board__status--ok">✓ Prayed</span>;
  }

  if (wakt.phase === 'passed' || wakt.salahStatus === 'missed') {
    return <span className="dawa-social-board__status dawa-social-board__status--missed">Wakt passed</span>;
  }

  if (wakt.phase === 'upcoming') {
    return (
      <span className="dawa-social-board__status dawa-social-board__status--wait">
        <span className={countdownClass}>
          <span className="dawa-num">{formatCountdownHms(remainingSeconds)}</span>
        </span>
        <span className="dawa-social-board__timer-sub">until {wakt.waktEndLabel ?? 'start'}</span>
      </span>
    );
  }

  if (wakt.forbiddenNow) {
    return (
      <span className="dawa-social-board__status dawa-social-board__status--forbidden">
        <span className={countdownClass}>
          <span className="dawa-num">{formatCountdownHms(remainingSeconds)}</span>
        </span>
        <span className="dawa-social-board__timer-sub">Forbidden time</span>
      </span>
    );
  }

  return (
    <span className="dawa-social-board__status dawa-social-board__status--active">
      <span className={countdownClass}>
        <span className="dawa-num">{formatCountdownHms(remainingSeconds)}</span>
      </span>
      <span className="dawa-social-board__timer-sub">left · ends {wakt.waktEndLabel ?? '—'}</span>
    </span>
  );
}

function MobileWaktInfo({ row }: { row: BoardRow }) {
  const { wakt } = row;
  const remainingSeconds = useWaktCountdown(wakt);
  const isLowTime = remainingSeconds <= 5 * 60;

  let statusText: React.ReactNode = null;
  let statusClass = 'dawa-social-board__mobile-status';

  if (wakt.isPrivate) {
    statusText = 'Private';
    statusClass += ' dawa-social-board__mobile-status--private';
  } else if (wakt.phase === 'prayed' || wakt.salahStatus === 'on-time') {
    statusText = '✓ Prayed';
    statusClass += ' dawa-social-board__mobile-status--ok';
  } else if (wakt.phase === 'passed' || wakt.salahStatus === 'missed') {
    statusText = 'Passed';
    statusClass += ' dawa-social-board__mobile-status--missed';
  } else if (wakt.phase === 'upcoming') {
    statusText = (
      <>
        <span className={`dawa-social-board__mobile-timer${isLowTime ? ' dawa-social-board__mobile-timer--danger' : ''}`}>
          {formatCountdownHms(remainingSeconds)}
        </span>
      </>
    );
    statusClass += ' dawa-social-board__mobile-status--wait';
  } else if (wakt.forbiddenNow) {
    statusText = (
      <span className="dawa-social-board__mobile-timer">
        {formatCountdownHms(remainingSeconds)}
      </span>
    );
    statusClass += ' dawa-social-board__mobile-status--forbidden';
  } else {
    statusText = (
      <span className={`dawa-social-board__mobile-timer${isLowTime ? ' dawa-social-board__mobile-timer--danger' : ''}`}>
        {formatCountdownHms(remainingSeconds)}
      </span>
    );
    statusClass += ' dawa-social-board__mobile-status--active';
  }

  return (
    <div className="dawa-social-board__mobile-info">
      <span className="dawa-social-board__mobile-name">{row.name}</span>
      <div className="dawa-social-board__mobile-sub">
        {row.badge && (
          <span className="dawa-social-board__mobile-badge">
            {row.badge.icon} {row.badge.name}
          </span>
        )}
        {row.badge && <span className="dawa-social-board__mobile-dot" aria-hidden />}
        <span className="dawa-social-board__mobile-prayer">{wakt.prayerLabel}</span>
        <span className="dawa-social-board__mobile-dot" aria-hidden />
        <span className={statusClass}>{statusText}</span>
      </div>
    </div>
  );
}

function BoardRowView({
  row,
  pokeBusy,
  onPoke,
  onCooldownEnd,
}: {
  row: BoardRow;
  pokeBusy: boolean;
  onPoke: (row: BoardRow) => void;
  onCooldownEnd: () => void;
}) {
  return (
    <div className="dawa-social-board__row" role="row">
      <UserProfileLink username={row.username} className="dawa-social-board__friend dawa-social-board__friend-link">
        <UserAvatar
          userId={row.id}
          name={row.name}
          avatarColor={row.avatarColor}
          avatarUrl={row.avatarUrl}
          size={40}
        />
        <div className="dawa-social-board__friend-info">
          <p className="dawa-social-board__name">{row.name}</p>
          <p className="dawa-social-board__meta">
            @{row.username ?? 'user'}
            {row.badge && (
              <span className="dawa-social-board__badge">
                {row.badge.icon} {row.badge.name}
              </span>
            )}
          </p>
          {!row.goldCoinsHidden && (
            <div className="dawa-social-board__coins">
              <GoldCoinAmount amount={row.goldCoins} size={13} />
            </div>
          )}
        </div>
      </UserProfileLink>
      <MobileWaktInfo row={row} />
      <div className="dawa-social-board__prayer">
        <span className="dawa-social-board__prayer-label">{row.wakt.prayerLabel}</span>
      </div>
      <WaktStatusCell row={row} />
      <div className="dawa-social-board__action">
        <PokeActionCell
          row={row}
          pokeBusy={pokeBusy}
          onPoke={onPoke}
          onCooldownEnd={onCooldownEnd}
        />
      </div>
    </div>
  );
}

type WaktBoardVirtualProps = {
  rows: BoardRow[];
  loading: boolean;
  pokeBusy: string | null;
  onPoke: (row: BoardRow) => void;
  onCooldownEnd: () => void;
};

export function WaktBoardVirtual({ rows, loading, pokeBusy, onPoke, onCooldownEnd }: WaktBoardVirtualProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 6,
  });

  if (loading && rows.length === 0) {
    return (
      <div className="dawa-social-board dawa-social-board--loading" aria-busy="true" aria-label="Loading wakt board">
        <div className="dawa-social-board__head" role="row">
          <span>Brother / Sister</span>
          <span>Prayer</span>
          <span>Status</span>
          <span>Action</span>
        </div>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="dawa-social-board__row dawa-social-board__row--skeleton" aria-hidden />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return <p className="dawa-social__empty">Connect with friends to see live salah status here.</p>;
  }

  return (
    <div className="dawa-social-board dawa-social-board--virtual">
      <div className="dawa-social-board__head" role="row">
        <span>Brother / Sister</span>
        <span>Prayer</span>
        <span>Status</span>
        <span>Action</span>
      </div>
      <div ref={parentRef} className="dawa-social-board__viewport">
        <div
          className="dawa-social-board__virtual-inner"
          style={{ height: `${virtualizer.getTotalSize()}px` }}
        >
          {virtualizer.getVirtualItems().map((item) => {
            const row = rows[item.index];
            return (
              <div
                key={row.id}
                className="dawa-social-board__virtual-row"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${item.start}px)`,
                }}
              >
                <BoardRowView
                  row={row}
                  pokeBusy={pokeBusy === row.id}
                  onPoke={onPoke}
                  onCooldownEnd={onCooldownEnd}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function useBoardSummaryPoll(onRevisionChange: () => void) {
  const revisionRef = useRef<string | null>(null);

  const checkSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/friends/board/summary');
      if (!res.ok) return;
      const json = (await res.json()) as { revision?: string };
      const revision = json.revision ?? '0';
      if (revisionRef.current !== null && revisionRef.current !== revision) {
        onRevisionChange();
      }
      revisionRef.current = revision;
    } catch {
      // ignore poll errors
    }
  }, [onRevisionChange]);

  useEffect(() => {
    void checkSummary();
    const id = setInterval(() => void checkSummary(), 60_000);
    return () => clearInterval(id);
  }, [checkSummary]);
}
