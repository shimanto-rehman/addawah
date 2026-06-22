'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { GoldCoin, GoldCoinAmount } from '@/components/ui/GoldCoin';
import { ConnectionActions } from '@/components/friends/ConnectionActions';
import { ProfilePrayerCharts } from '@/components/profile/ProfilePrayerCharts';
import type { ConnectionInfo } from '@/lib/friendship';
import type { ProfilePrivacy } from '@/lib/profile-privacy';
import type { PublicUserStats } from '@/lib/user-public-stats';

const profileFetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Not found');
  return json;
};

type Badge = { id: string; name: string; minCoins: number; icon: string; blurb: string };

type ProfilePayload = {
  profile: {
    id: string;
    name: string;
    username: string | null;
    avatarColor: string;
    avatarUrl: string | null;
    city: string | null;
    country: string | null;
    bio: string | null;
    memberSince: string | null;
    badge: Badge | null;
  };
  stats: (PublicUserStats & { goldCoins: number | null }) | null;
  statsHidden: boolean;
  connection: ConnectionInfo;
  viewerIsSelf: boolean;
  privacy?: ProfilePrivacy;
};

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="dawa-user-profile__stat">
      <p className="dawa-user-profile__stat-val">{value}</p>
      <p className="dawa-user-profile__stat-label">{label}</p>
      {hint && <p className="dawa-user-profile__stat-hint">{hint}</p>}
    </div>
  );
}

export function PublicUserProfile({ username }: { username: string }) {
  const { data, error, isLoading, mutate } = useSWR<ProfilePayload>(
    `/api/users/${encodeURIComponent(username)}`,
    profileFetcher,
  );

  if (isLoading) {
    return <p className="dawa-social__empty">Loading profile…</p>;
  }

  if (error || !data?.profile) {
    return (
      <div className="dawa-user-profile">
        <PageHeader title="Profile" subtitle="User not found." arabicLabel="الملف" />
        <Link href="/friends" className="dawa-btn dawa-btn--ghost dawa-btn--sm">← Back to Friends</Link>
      </div>
    );
  }

  const { profile, stats, statsHidden, connection, viewerIsSelf } = data;
  const location = [profile.city, profile.country].filter(Boolean).join(', ');
  const memberSince = profile.memberSince
    ? new Date(profile.memberSince).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div className="dawa-user-profile">
      <div className="dawa-user-profile__nav">
        <Link href="/friends" className="dawa-btn dawa-btn--ghost dawa-btn--sm">← Friends</Link>
        {viewerIsSelf ? (
          <Link href="/profile" className="dawa-btn dawa-btn--ghost dawa-btn--sm">
            Edit profile & privacy
          </Link>
        ) : (
          <Link href="/friends/connections" className="dawa-btn dawa-btn--ghost dawa-btn--sm">
            Manage connections
          </Link>
        )}
      </div>

      <section className="dawa-glass dawa-user-profile__hero">
        <UserAvatar
          userId={profile.id}
          name={profile.name}
          avatarColor={profile.avatarColor}
          avatarUrl={profile.avatarUrl}
          size={88}
          className="dawa-user-profile__avatar"
        />
        <div className="dawa-user-profile__head">
          <h1 className="dawa-user-profile__name">{profile.name}</h1>
          <p className="dawa-user-profile__user">@{profile.username ?? 'user'}</p>
          {profile.bio && <p className="dawa-user-profile__bio">{profile.bio}</p>}
          {location && <p className="dawa-user-profile__loc">{location}</p>}
          {memberSince && <p className="dawa-user-profile__since">Member since {memberSince}</p>}
          {(profile.badge || (stats?.goldCoins != null)) && (
            <div className="dawa-user-profile__badge-row">
              {profile.badge && (
                <>
                  <span className="dawa-social__badge-icon">{profile.badge.icon}</span>
                  <span>{profile.badge.name}</span>
                </>
              )}
              {stats?.goldCoins != null && (
                <GoldCoinAmount amount={stats.goldCoins} size={16} />
              )}
            </div>
          )}
        </div>
        <div className="dawa-user-profile__actions">
          <ConnectionActions
            status={connection.status}
            friendshipId={connection.friendshipId}
            targetName={profile.name}
            targetUserId={profile.id}
            targetUsername={profile.username}
            onChanged={() => mutate()}
          />
        </div>
      </section>

      <section className="dawa-glass dawa-user-profile__stats-panel">
        <div className="dawa-user-profile__stats-head">
          <h2 className="dawa-social__title">Salah stats</h2>
          {stats?.isDemoFilled && !statsHidden && (
            <span className="dawa-social__chip">Preview data</span>
          )}
        </div>
        {statsHidden || !stats ? (
          <p className="dawa-user-profile__private-note">
            This user keeps their salah statistics private.
          </p>
        ) : (
          <>
            <div className="dawa-user-profile__stats-grid">
              <StatCard label="This week" value={`${stats.weekRate}%`} hint={`${stats.weekCompleted}/${stats.weekTotal} fard`} />
              <StatCard label="Streak" value={`${stats.streak} days`} />
              <StatCard label="Lifetime rate" value={`${stats.lifetimeRate}%`} />
              <StatCard label="Prayers logged" value={String(stats.lifetimePrayed)} />
              <StatCard label="Perfect days" value={String(stats.perfectDays)} />
              <StatCard label="Active days" value={String(stats.activeDays)} />
              <StatCard label="Days on Addawah" value={String(stats.daysOnApp)} />
              <StatCard label="Fajr missed" value={String(stats.fajrMissed)} />
              {stats.bestPrayer && (
                <StatCard
                  label="Strongest prayer"
                  value={stats.bestPrayer.label}
                  hint={`${stats.bestPrayer.rate}% on time`}
                />
              )}
            </div>
            <p className="dawa-user-profile__stats-note">
              <GoldCoin size={14} /> Gold coins earned through wakt salah and dawah reminders.
            </p>
          </>
        )}
      </section>

      {!statsHidden && profile.username && (
        <ProfilePrayerCharts
          insightsUrl={`/api/users/${encodeURIComponent(profile.username)}/insights`}
          title="Prayer charts"
        />
      )}
    </div>
  );
}
