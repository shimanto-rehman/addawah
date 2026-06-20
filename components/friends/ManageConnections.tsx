'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { GoldCoinAmount } from '@/components/ui/GoldCoin';
import { ConnectionActions } from '@/components/friends/ConnectionActions';
import { UserProfileLink } from '@/components/friends/UserProfileLink';
import type { ConnectionStatus } from '@/lib/friendship';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Badge = { id: string; name: string; minCoins: number; icon: string; blurb: string };

type ConnectionRow = {
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
  role: 'friend' | 'incoming' | 'outgoing';
};

function connectionStatus(role: ConnectionRow['role']): ConnectionStatus {
  if (role === 'friend') return 'connected';
  if (role === 'incoming') return 'pending_received';
  return 'pending_sent';
}

export function ManageConnections() {
  const { data, mutate, isLoading } = useSWR<{
    friends: ConnectionRow[];
    requests: ConnectionRow[];
    pending: ConnectionRow[];
    counts: { friends: number; requests: number; pending: number };
  }>('/api/friends/connections', fetcher);

  function refresh() {
    mutate();
  }

  return (
    <div className="dawa-social">
      <PageHeader
        title="Manage connections"
        subtitle="View, accept, or remove your brotherhood connections."
        arabicLabel="الصلات"
      />

      <div className="dawa-social__manage-nav">
        <Link href="/friends" className="dawa-btn dawa-btn--ghost dawa-btn--sm">
          ← Back to Friends
        </Link>
      </div>

      {isLoading ? (
        <p className="dawa-social__empty">Loading connections…</p>
      ) : (
        <>
          {(data?.requests?.length ?? 0) > 0 && (
            <section className="dawa-glass dawa-social__section">
              <h2 className="dawa-social__title">Incoming requests</h2>
              <p className="dawa-social__sub">{data?.counts.requests} waiting for you</p>
              <ul className="dawa-social__conn-list">
                {data?.requests.map((r) => (
                  <li key={r.friendshipId} className="dawa-social__conn-item">
                    <UserProfileLink username={r.username} className="dawa-social__conn-profile">
                      <UserAvatar name={r.name} avatarColor={r.avatarColor} avatarUrl={r.avatarUrl} size={48} />
                      <div>
                        <p className="dawa-social__conn-name">{r.name}</p>
                        <p className="dawa-social__conn-meta">@{r.username ?? 'user'}</p>
                      </div>
                    </UserProfileLink>
                    <ConnectionActions
                      status={connectionStatus(r.role)}
                      friendshipId={r.friendshipId}
                      targetName={r.name}
                      targetUserId={r.id}
                      size="sm"
                      onChanged={refresh}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(data?.pending?.length ?? 0) > 0 && (
            <section className="dawa-glass dawa-social__section">
              <h2 className="dawa-social__title">Sent requests</h2>
              <p className="dawa-social__sub">{data?.counts.pending} pending</p>
              <ul className="dawa-social__conn-list">
                {data?.pending.map((r) => (
                  <li key={r.friendshipId} className="dawa-social__conn-item">
                    <UserProfileLink username={r.username} className="dawa-social__conn-profile">
                      <UserAvatar name={r.name} avatarColor={r.avatarColor} avatarUrl={r.avatarUrl} size={48} />
                      <div>
                        <p className="dawa-social__conn-name">{r.name}</p>
                        <p className="dawa-social__conn-meta">@{r.username ?? 'user'}</p>
                      </div>
                    </UserProfileLink>
                    <ConnectionActions
                      status={connectionStatus(r.role)}
                      friendshipId={r.friendshipId}
                      targetName={r.name}
                      targetUserId={r.id}
                      size="sm"
                      onChanged={refresh}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="dawa-glass dawa-social__section">
            <h2 className="dawa-social__title">Your connections</h2>
            <p className="dawa-social__sub">{data?.counts.friends ?? 0} connected</p>
            {(data?.friends?.length ?? 0) === 0 ? (
              <p className="dawa-social__empty">No connections yet. Find people on the Friends page.</p>
            ) : (
              <ul className="dawa-social__conn-list">
                {data?.friends.map((f) => (
                  <li key={f.friendshipId} className="dawa-social__conn-item">
                    <UserProfileLink username={f.username} className="dawa-social__conn-profile">
                      <UserAvatar name={f.name} avatarColor={f.avatarColor} avatarUrl={f.avatarUrl} size={48} />
                      <div>
                        <p className="dawa-social__conn-name">{f.name}</p>
                        <p className="dawa-social__conn-meta">
                          @{f.username ?? 'user'}
                          {f.weekRateHidden ? '' : ` · ${f.weekRate ?? 0}% this week`}
                          {f.badge && <> · {f.badge.icon} {f.badge.name}</>}
                        </p>
                      </div>
                    </UserProfileLink>
                    <div className="dawa-social__conn-side">
                      {!f.goldCoinsHidden && <GoldCoinAmount amount={f.goldCoins} size={15} />}
                      <ConnectionActions
                        status="connected"
                        friendshipId={f.friendshipId}
                        targetName={f.name}
                        targetUserId={f.id}
                        size="sm"
                        onChanged={refresh}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
