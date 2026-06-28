'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { GoldCoin, GoldCoinAmount } from '@/components/ui/GoldCoin';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { UserProfileLink } from '@/components/friends/UserProfileLink';
import { UsernameSearch } from '@/components/friends/UsernameSearch';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  WaktBoardVirtual,
  useBoardSummaryPoll,
  type BoardRow,
} from '@/components/friends/WaktBoardVirtual';
import { BADGE_TIERS, PRAYER_REWARD, REWARD_POINTS } from '@/lib/rewards';

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const HUB_LIMIT = 20;

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
  requestSent?: boolean;
  avatarColor: string;
  avatarUrl?: string | null;
};

type SuggestionsResponse = {
  suggestions: SuggestedPerson[];
  nextCursor: number;
  hasMore: boolean;
};

type HubResponse = {
  me: { goldCoins: number; badge: Badge };
  requests: Friend[];
  friends: Friend[];
  board: BoardRow[];
  page: {
    cursor: number;
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
    totalFriends: number;
  };
  summary: {
    activeInWakt: number;
    pokeable: number;
    totalFriends: number;
    revision: string;
  };
};

export function FriendsHub() {
  const hubKey = `/api/friends/hub?cursor=0&limit=${HUB_LIMIT}`;
  const { data: hubData, mutate: mutateHub, isLoading: hubLoading } = useSWR<HubResponse>(
    hubKey,
    fetcher,
    { revalidateOnFocus: false },
  );

  const [extraFriends, setExtraFriends] = useState<Friend[]>([]);
  const [extraBoard, setExtraBoard] = useState<BoardRow[]>([]);
  const [pageMeta, setPageMeta] = useState<HubResponse['page'] | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const { data: suggestData, mutate: mutateSuggestions } = useSWR<SuggestionsResponse>(
    '/api/friends/suggestions?cursor=0&limit=8',
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
  const [suggestions, setSuggestions] = useState<SuggestedPerson[]>([]);
  const [suggestCursor, setSuggestCursor] = useState(0);
  const [hasMoreSuggestions, setHasMoreSuggestions] = useState(false);
  const [loadingMoreSuggestions, setLoadingMoreSuggestions] = useState(false);
  const [connectSuggestBusy, setConnectSuggestBusy] = useState<string | null>(null);
  const suggestionsRef = useRef<HTMLDivElement | null>(null);

  const resetHubPages = useCallback(() => {
    setExtraFriends([]);
    setExtraBoard([]);
    setPageMeta(null);
  }, []);

  const refreshHub = useCallback(() => {
    resetHubPages();
    void mutateHub();
  }, [mutateHub, resetHubPages]);

  useBoardSummaryPoll(refreshHub);

  useEffect(() => {
    if (hubData?.page) setPageMeta(hubData.page);
  }, [hubData?.page]);

  const friends = [...(hubData?.friends ?? []), ...extraFriends];
  const boardRows = [...(hubData?.board ?? []), ...extraBoard];
  const requests = hubData?.requests ?? [];
  const summary = hubData?.summary;
  const hasMoreFriends = pageMeta?.hasMore ?? hubData?.page?.hasMore ?? false;
  const totalFriends = pageMeta?.totalFriends ?? hubData?.page?.totalFriends ?? friends.length;

  async function loadMoreFriends() {
    const nextCursor = pageMeta?.nextCursor ?? hubData?.page?.nextCursor;
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/friends/hub?cursor=${nextCursor}&limit=${HUB_LIMIT}`);
      const json = (await res.json()) as HubResponse;
      if (!res.ok) return;
      setExtraFriends((prev) => {
        const seen = new Set(prev.map((f) => f.id));
        return [...prev, ...json.friends.filter((f) => !seen.has(f.id))];
      });
      setExtraBoard((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        return [...prev, ...json.board.filter((r) => !seen.has(r.id))];
      });
      setPageMeta(json.page);
    } finally {
      setLoadingMore(false);
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  }

  useEffect(() => {
    if (!suggestData) return;
    setSuggestions(suggestData.suggestions ?? []);
    setSuggestCursor(suggestData.nextCursor ?? (suggestData.suggestions?.length ?? 0));
    setHasMoreSuggestions(Boolean(suggestData.hasMore));
  }, [suggestData]);

  const loadMoreSuggestions = useCallback(async () => {
    if (loadingMoreSuggestions || !hasMoreSuggestions) return;
    setLoadingMoreSuggestions(true);
    try {
      const res = await fetch(`/api/friends/suggestions?cursor=${suggestCursor}&limit=8`);
      const json = (await res.json()) as SuggestionsResponse;
      if (!res.ok) return;
      setSuggestions((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        const incoming = (json.suggestions ?? []).filter((item) => !seen.has(item.id));
        return [...prev, ...incoming];
      });
      setSuggestCursor(json.nextCursor ?? suggestCursor);
      setHasMoreSuggestions(Boolean(json.hasMore));
    } finally {
      setLoadingMoreSuggestions(false);
    }
  }, [hasMoreSuggestions, loadingMoreSuggestions, suggestCursor]);

  useEffect(() => {
    const container = suggestionsRef.current;
    if (!container) return;

    const onScroll = () => {
      if (!hasMoreSuggestions || loadingMoreSuggestions) return;
      const nearEnd =
        container.scrollLeft + container.clientWidth >= container.scrollWidth - 180;
      if (nearEnd) void loadMoreSuggestions();
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [hasMoreSuggestions, loadMoreSuggestions, loadingMoreSuggestions]);

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
    refreshHub();
    mutateSuggestions();
  }

  async function connectSuggestion(person: SuggestedPerson) {
    if (person.requestSent || connectSuggestBusy === person.id) return;
    setConnectSuggestBusy(person.id);
    const res = await fetch('/api/friends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: person.id }),
    });
    const json = await res.json();
    setConnectSuggestBusy(null);
    if (!res.ok) {
      showToast(json.error || 'Could not send request');
      return;
    }
    setSuggestions((prev) =>
      prev.map((item) => (item.id === person.id ? { ...item, requestSent: true } : item)),
    );
    showToast('Connect request sent');
    mutateSuggestions();
  }

  async function acceptFriend() {
    if (!acceptTarget) return;
    await fetch('/api/friends', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friendshipId: acceptTarget.friendshipId, action: 'accept' }),
    });
    setAcceptTarget(null);
    refreshHub();
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
    if (!res.ok) {
      showToast(json.error || 'Could not send reminder');
      return;
    }
    showToast(
      json.coinsEarned
        ? `Dawah sent · +${json.coinsEarned} gold coins`
        : 'Gentle reminder sent',
    );
    refreshHub();
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
              <span className="dawa-num">{hubData?.me?.goldCoins ?? '—'}</span>
            </span>
            <span className="dawa-social__hero-lbl">Gold coins</span>
          </div>
        </div>

        <div className="dawa-social__hero-bridge" aria-hidden />

        <div
          className="dawa-social__hero-side dawa-social__hero-side--right"
          title={hubData?.me?.badge?.blurb ?? ''}
        >
          <div className="dawa-social__hero-copy">
            <span className="dawa-social__hero-val">{hubData?.me?.badge?.name ?? 'Seedling'}</span>
            <span className="dawa-social__hero-lbl">Badge</span>
          </div>
          <span className="dawa-social__hero-emoji" aria-hidden>
            {hubData?.me?.badge?.icon ?? '🌱'}
          </span>
        </div>
      </div>

      {requests.length > 0 && (
        <section className="dawa-glass dawa-social__section">
          <div className="dawa-social__section-head">
            <h2 className="dawa-social__title">Connect requests</h2>
            <Link href="/friends/connections" className="dawa-btn dawa-btn--ghost dawa-btn--sm">
              Manage all
            </Link>
          </div>
          <ul className="dawa-social__requests">
            {requests.map((r) => (
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
          <div>
            <h2 className="dawa-social__title">Wakt board</h2>
            <p className="dawa-social__sub dawa-social__sub--inline">
              Live salah status · poke during wakt for dawah coins
              {summary && summary.totalFriends > 0 && (
                <>
                  {' '}
                  · <span className="dawa-num">{summary.activeInWakt}</span> in wakt
                  {summary.pokeable > 0 && (
                    <>
                      {' '}
                      · <span className="dawa-num">{summary.pokeable}</span> pokeable
                    </>
                  )}
                </>
              )}
            </p>
          </div>
        </div>

        <WaktBoardVirtual
          rows={boardRows}
          loading={hubLoading}
          pokeBusy={pokeBusy}
          onPoke={poke}
          onCooldownEnd={refreshHub}
        />

        {hasMoreFriends && (
          <div className="dawa-social__load-more">
            <button
              type="button"
              className="dawa-btn dawa-btn--outline dawa-btn--sm"
              disabled={loadingMore}
              onClick={() => void loadMoreFriends()}
            >
              {loadingMore
                ? 'Loading…'
                : `Load more (${friends.length} of ${totalFriends})`}
            </button>
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
          {friends.map((f) => (
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
        {hasMoreFriends && (
          <div className="dawa-social__load-more">
            <button
              type="button"
              className="dawa-btn dawa-btn--ghost dawa-btn--sm"
              disabled={loadingMore}
              onClick={() => void loadMoreFriends()}
            >
              {loadingMore ? 'Loading…' : 'Load more friends'}
            </button>
          </div>
        )}
      </section>

      <section className="dawa-glass dawa-social__section">
        <div className="dawa-social__section-head">
          <h2 className="dawa-social__title">People you may know</h2>
          <span className="dawa-social__chip">Suggested</span>
        </div>
        <div className="dawa-social__suggestions" ref={suggestionsRef}>
          {suggestions.length === 0 ? (
            <p className="dawa-social__empty">No new suggestions right now.</p>
          ) : (
            suggestions.map((p) => (
              <article key={p.id} className="dawa-social__suggest-card">
                <UserProfileLink username={p.username} className="dawa-social__suggest-link">
                  <UserAvatar name={p.name} userId={p.id} avatarColor={p.avatarColor} avatarUrl={p.avatarUrl} size={56} />
                  <p className="dawa-social__suggest-name">{p.name}</p>
                  <p className="dawa-social__suggest-user">@{p.username ?? 'user'}</p>
                  <p className="dawa-social__suggest-bio">{p.bio}</p>
                </UserProfileLink>
                <p className="dawa-social__suggest-mutual">{p.mutualFriends} mutual friends</p>
                {p.requestSent ? (
                  <span className="dawa-social__suggest-sent">Request sent</span>
                ) : (
                  <button
                    type="button"
                    className="dawa-btn dawa-btn--primary dawa-btn--sm dawa-social__suggest-btn"
                    disabled={connectSuggestBusy === p.id}
                    onClick={() => connectSuggestion(p)}
                  >
                    {connectSuggestBusy === p.id ? '…' : 'Connect'}
                  </button>
                )}
              </article>
            ))
          )}
          {loadingMoreSuggestions && (
            <p className="dawa-social__suggest-loading" aria-live="polite">
              Loading more...
            </p>
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
