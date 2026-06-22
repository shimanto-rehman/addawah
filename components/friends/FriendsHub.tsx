'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { userProfilePath } from '@/lib/user-public-stats';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { GoldCoin, GoldCoinAmount } from '@/components/ui/GoldCoin';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { UserProfileLink } from '@/components/friends/UserProfileLink';
import { UsernameSearch } from '@/components/friends/UsernameSearch';
import { PageHeader } from '@/components/layout/PageHeader';
import type { PrayerName } from '@/lib/constants';
import type { FriendWaktPhase } from '@/lib/friends-wakt';
import { BADGE_TIERS, PRAYER_REWARD, REWARD_POINTS } from '@/lib/rewards';
import { formatCountdownHms } from '@/lib/wakt-display';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Badge = { id: string; name: string; minCoins: number; icon: string; blurb: string };

type Friend = {
  id: string;
  name: string;
  username: string | null;
  email: string;
  avatarColor: string;
  avatarUrl?: string | null;
  weekRate: number | null;
  weekRateHidden?: boolean;
  friendshipId: string;
  goldCoins: number;
  goldCoinsHidden?: boolean;
  badge: Badge | null;
};

type SuggestedPerson = {
  id: string;
  name: string;
  username: string | null;
  bio: string;
  mutualFriends: number;
  avatarColor: string;
  avatarUrl?: string | null;
};

type BoardRow = {
  id: string;
  name: string;
  username: string | null;
  avatarColor: string;
  avatarUrl?: string | null;
  goldCoins: number;
  goldCoinsHidden?: boolean;
  badge: Badge | null;
  wakt: {
    prayer: PrayerName | null;
    prayerLabel: string;
    phase: FriendWaktPhase;
    salahStatus: string;
    waktStartedAt: string | null;
    waktEndsAt: string | null;
    waktEndLabel: string | null;
    canPoke: boolean;
    forbiddenNow: boolean;
    elapsedMinutes: number;
    remainingMinutes: number;
    elapsedSeconds: number;
    remainingSeconds: number;
    isPrivate?: boolean;
  };
};

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
  }, [
    wakt.phase,
    wakt.waktEndsAt,
    wakt.waktStartedAt,
    wakt.remainingSeconds,
  ]);

  return remainingSeconds;
}

function WaktStatusCell({ row }: { row: BoardRow }) {
  const { wakt } = row;
  const remainingSeconds = useWaktCountdown(wakt);
  const isLowTime = remainingSeconds <= 5 * 60;
  const countdownClass = `dawa-social-board__timer dawa-social-board__timer--countdown${
    isLowTime ? ' dawa-social-board__timer--danger' : ''
  }`;

  if (wakt.isPrivate) {
    return (
      <span className="dawa-social-board__status dawa-social-board__status--private">
        Private
      </span>
    );
  }

  if (wakt.phase === 'prayed' || wakt.salahStatus === 'on-time') {
    return (
      <span className="dawa-social-board__status dawa-social-board__status--ok">
        ✓ Prayed
      </span>
    );
  }

  if (wakt.phase === 'passed' || wakt.salahStatus === 'missed') {
    return (
      <span className="dawa-social-board__status dawa-social-board__status--missed">
        Wakt passed
      </span>
    );
  }

  if (wakt.phase === 'upcoming') {
    return (
      <span className="dawa-social-board__status dawa-social-board__status--wait">
        <span className={countdownClass}>
          {formatCountdownHms(remainingSeconds)}
        </span>
        <span className="dawa-social-board__timer-sub">
          until {wakt.waktEndLabel ?? 'start'}
        </span>
      </span>
    );
  }

  if (wakt.forbiddenNow) {
    return (
      <span className="dawa-social-board__status dawa-social-board__status--forbidden">
        <span className={countdownClass}>
          {formatCountdownHms(remainingSeconds)}
        </span>
        <span className="dawa-social-board__timer-sub">Forbidden time</span>
      </span>
    );
  }

  return (
    <span className="dawa-social-board__status dawa-social-board__status--active">
      <span className={countdownClass}>
        {formatCountdownHms(remainingSeconds)}
      </span>
      <span className="dawa-social-board__timer-sub">
        left · ends {wakt.waktEndLabel ?? '—'}
      </span>
    </span>
  );
}

export function FriendsHub() {
  const { data, mutate } = useSWR<{
    friends: Friend[];
    requests: Friend[];
    me: { goldCoins: number; badge: Badge };
  }>('/api/friends', fetcher, { revalidateOnFocus: false });

  const { data: boardData, mutate: mutateBoard } = useSWR<{ board: BoardRow[] }>(
    '/api/friends/board',
    fetcher,
    { refreshInterval: 120_000, revalidateOnFocus: true },
  );

  const { data: suggestData, mutate: mutateSuggestions } = useSWR<{ suggestions: SuggestedPerson[] }>(
    '/api/friends/suggestions',
    fetcher,
    { revalidateOnFocus: false },
  );

  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pokeBusy, setPokeBusy] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [connectConfirm, setConnectConfirm] = useState(false);
  const [acceptTarget, setAcceptTarget] = useState<Friend | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  }

  async function sendConnectRequest() {
    setError('');
    setLoading(true);
    const query = username.trim().replace(/^@/, '');
    const res = await fetch('/api/friends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: query }),
    });
    const json = await res.json();
    setLoading(false);
    setConnectConfirm(false);
    if (!res.ok) {
      setError(json.error || 'Could not send request');
      return;
    }
    setUsername('');
    showToast('Connect request sent');
    mutate();
    mutateSuggestions();
  }

  const boardRows = boardData?.board ?? [];

  async function acceptFriend() {
    if (!acceptTarget) return;
    await fetch('/api/friends', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friendshipId: acceptTarget.friendshipId, action: 'accept' }),
    });
    setAcceptTarget(null);
    mutate();
    mutateBoard();
    mutateSuggestions();
    showToast(`Connected with ${acceptTarget.name.split(' ')[0]}`);
  }

  async function poke(friend: BoardRow) {
    if (!friend.wakt.canPoke) return;
    if (!friend.wakt.prayer) return;
    setPokeBusy(friend.id);
    const res = await fetch('/api/pokes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friendId: friend.id, prayer: friend.wakt.prayer }),
    });
    const json = await res.json();
    setPokeBusy(null);
    if (res.ok) {
      showToast(
        json.coinsEarned
          ? `Dawah sent · +${json.coinsEarned} gold coins`
          : 'Gentle reminder sent',
      );
      mutate();
    }
  }

  return (
    <div className="dawa-social">
      {toast && <p className="dawa-social__toast">{toast}</p>}

      <PageHeader
        title="Brotherhood"
        subtitle="Walk the path of salah together — remind, uplift, earn gold."
        arabicLabel="الأصدقاء"
        toolbar={
          <div className="dawa-intro__connect">
            <UsernameSearch
              variant="compact"
              connectBusy={loading}
              onRequestConnect={(name) => {
                setError('');
                setUsername(name);
                setConnectConfirm(true);
              }}
            />
            {error && <p className="dawa-error dawa-intro__connect-error">{error}</p>}
          </div>
        }
      />

      <div className="dawa-social__hero dawa-glass">
        <div className="dawa-social__hero-side dawa-social__hero-side--left">
          <GoldCoin size={28} className="dawa-social__hero-coin" />
          <div className="dawa-social__hero-copy">
            <span className="dawa-social__hero-val dawa-social__hero-val--gold">
              {data?.me?.goldCoins ?? '—'}
            </span>
            <span className="dawa-social__hero-lbl">Gold coins</span>
          </div>
        </div>

        <div className="dawa-social__hero-bridge" aria-hidden />

        <div
          className="dawa-social__hero-side dawa-social__hero-side--right"
          title={data?.me?.badge?.blurb ?? ''}
        >
          <div className="dawa-social__hero-copy">
            <span className="dawa-social__hero-val">{data?.me?.badge?.name ?? 'Seedling'}</span>
            <span className="dawa-social__hero-lbl">Badge</span>
          </div>
          <span className="dawa-social__hero-emoji" aria-hidden>
            {data?.me?.badge?.icon ?? '🌱'}
          </span>
        </div>
      </div>

      {(data?.requests?.length ?? 0) > 0 && (
        <section className="dawa-glass dawa-social__section">
          <div className="dawa-social__section-head">
            <h2 className="dawa-social__title">Connect requests</h2>
            <Link href="/friends/connections" className="dawa-btn dawa-btn--ghost dawa-btn--sm">
              Manage all
            </Link>
          </div>
          <ul className="dawa-social__requests">
            {data?.requests.map((r) => (
              <li key={r.friendshipId} className="dawa-social__request">
                <UserProfileLink username={r.username} className="dawa-social__request-profile">
                  <UserAvatar name={r.name} userId={r.id} avatarColor={r.avatarColor} avatarUrl={r.avatarUrl} size={48} />
                  <div className="dawa-social__request-text">
                    <strong>{r.name}</strong>
                    <span>@{r.username ?? r.email.split('@')[0]}</span>
                  </div>
                </UserProfileLink>
                <button type="button" className="dawa-btn dawa-btn--primary dawa-btn--sm dawa-social__request-btn" onClick={() => setAcceptTarget(r)}>
                  Accept
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="dawa-glass dawa-social__section">
        <div className="dawa-social__section-head">
          <h2 className="dawa-social__title">Wakt board</h2>
          <p className="dawa-social__sub dawa-social__sub--inline">
            Live salah status · poke during wakt for dawah coins
          </p>
        </div>

        {(boardRows.length ?? 0) === 0 ? (
          <p className="dawa-social__empty">Connect with friends to see live salah status here.</p>
        ) : (
          <div className="dawa-social-board">
            <div className="dawa-social-board__head" role="row">
              <span>Brother / Sister</span>
              <span>Prayer</span>
              <span>Status</span>
              <span>Action</span>
            </div>
            {boardRows.map((row) => (
              <div
                key={row.id}
                className="dawa-social-board__row"
                role="row"
              >
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
                <div className="dawa-social-board__prayer">
                  <span className="dawa-social-board__prayer-label">{row.wakt.prayerLabel}</span>
                </div>
                <WaktStatusCell row={row} />
                <div className="dawa-social-board__action">
                  {row.wakt.canPoke ? (
                    <button
                      type="button"
                      className="dawa-poke"
                      disabled={pokeBusy === row.id}
                      onClick={() => poke(row)}
                    >
                      {pokeBusy === row.id ? '…' : 'Poke 🤲'}
                    </button>
                  ) : row.wakt.forbiddenNow &&
                    row.wakt.phase === 'active' &&
                    row.wakt.salahStatus === 'pending' ? (
                    <span className="dawa-social-board__muted" title="Forbidden time">
                      Wait
                    </span>
                  ) : row.wakt.salahStatus === 'on-time' || row.wakt.phase === 'prayed' ? (
                    <span className="dawa-social-board__done">Prayed ✓</span>
                  ) : (
                    <span className="dawa-social-board__muted">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="dawa-glass dawa-social__section">
        <div className="dawa-social__section-head">
          <div>
            <h2 className="dawa-social__title">Your circle</h2>
            <p className="dawa-social__sub dawa-social__sub--inline">Friends & weekly salah completion</p>
          </div>
          <Link href="/friends/connections" className="dawa-btn dawa-btn--outline dawa-btn--sm">
            Manage connections
          </Link>
        </div>
        <ul className="dawa-social__circle">
          {(data?.friends ?? []).map((f) => (
            <li key={f.id} className="dawa-social__circle-item">
              <UserProfileLink username={f.username} className="dawa-social__circle-link">
                <UserAvatar name={f.name} userId={f.id} avatarColor={f.avatarColor} avatarUrl={f.avatarUrl} size={44} />
                <div>
                  <p className="dawa-social__circle-name">{f.name}</p>
                  <p className="dawa-social__circle-meta">
                    @{f.username ?? 'user'}
                    {f.weekRateHidden ? '' : ` · ${f.weekRate ?? 0}% this week`}
                    {f.badge && <> · {f.badge.icon} {f.badge.name}</>}
                  </p>
                </div>
              </UserProfileLink>
              {!f.goldCoinsHidden && <GoldCoinAmount amount={f.goldCoins} size={15} />}
            </li>
          ))}
        </ul>
      </section>

      <section className="dawa-glass dawa-social__section">
        <div className="dawa-social__section-head">
          <h2 className="dawa-social__title">People you may know</h2>
          <span className="dawa-social__chip">Suggested</span>
        </div>
        <div className="dawa-social__suggestions">
          {(suggestData?.suggestions?.length ?? 0) === 0 ? (
            <p className="dawa-social__empty">No new suggestions right now.</p>
          ) : (
          suggestData?.suggestions?.map((p) => (
            <article
              key={p.id}
              className="dawa-social__suggest-card"
            >
              <UserProfileLink username={p.username} className="dawa-social__suggest-link">
                <UserAvatar name={p.name} userId={p.id} avatarColor={p.avatarColor} avatarUrl={p.avatarUrl} size={56} />
                <p className="dawa-social__suggest-name">{p.name}</p>
                <p className="dawa-social__suggest-user">@{p.username ?? 'user'}</p>
                <p className="dawa-social__suggest-bio">{p.bio}</p>
              </UserProfileLink>
              <p className="dawa-social__suggest-mutual">{p.mutualFriends} mutual friends</p>
              <Link
                href={p.username ? userProfilePath(p.username) : '/friends'}
                className="dawa-btn dawa-btn--ghost dawa-btn--sm dawa-social__suggest-btn"
              >
                View profile
              </Link>
            </article>
          ))
          )}
        </div>
      </section>

      <section className="dawa-glass dawa-social__section dawa-social__rewards-info">
        <h2 className="dawa-social__title">Gold coins & badges</h2>
        <ul className="dawa-social__reward-list">
          <li>
            <GoldCoin size={16} /> <strong>up to +{PRAYER_REWARD.MAX}</strong> — mark fard in wakt
            (decays to +{PRAYER_REWARD.MIN} near the end)
          </li>
          <li>⚡ Pray at adhan for peak gold — the sooner in wakt, the more you earn</li>
          <li>🤲 <strong>+{REWARD_POINTS.DAWAH_IN_WAKT}</strong> — send dawah (poke) while their wakt is active</li>
        </ul>
        <div className="dawa-social__badge-grid">
          {BADGE_TIERS.map((tier) => (
            <span key={tier.id} className="dawa-social__badge-chip">
              {tier.icon} {tier.name}
              {tier.minCoins > 0 ? ` · ${tier.minCoins.toLocaleString()}g` : ''}
            </span>
          ))}
        </div>
      </section>

      <ConfirmModal
        open={connectConfirm}
        title="Send connect request?"
        message={
          username.trim()
            ? `Send a connection request to @${username.trim().replace(/^@/, '')}?`
            : 'Send this connection request?'
        }
        confirmLabel="Send request"
        busy={loading}
        onConfirm={sendConnectRequest}
        onCancel={() => setConnectConfirm(false)}
      />

      <ConfirmModal
        open={!!acceptTarget}
        title="Accept connection?"
        message={
          acceptTarget
            ? `Accept ${acceptTarget.name}'s connection request?`
            : ''
        }
        confirmLabel="Accept"
        onConfirm={acceptFriend}
        onCancel={() => setAcceptTarget(null)}
      />
    </div>
  );
}
