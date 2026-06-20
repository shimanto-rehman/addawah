'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/layout/PageHeader';
import { UserAvatar } from '@/components/profile/UserAvatar';
const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Friend = {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  avatarUrl?: string | null;
  weekRate: number;
  friendshipId: string;
};

type Request = Friend & { status: string };

export default function FriendsPage() {
  const { data, mutate } = useSWR<{ friends: Friend[]; requests: Request[] }>('/api/friends', fetcher);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function addFriend(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/friends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error || 'Could not send request');
      return;
    }
    setEmail('');
    mutate();
  }

  async function accept(id: string) {
    await fetch('/api/friends', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friendshipId: id, action: 'accept' }),
    });
    mutate();
  }

  async function poke(friendId: string) {
    await fetch('/api/pokes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friendId }),
    });
  }

  return (
    <>
      <PageHeader
        title="Brotherhood"
        subtitle="Hold one another accountable with kindness and mercy."
        arabicLabel="الأصدقاء"
      />

      <div className="dawa-panel">
        <h2 className="dawa-panel__title">Add a friend</h2>
        <p className="dawa-panel__sub">Send an invitation by email</p>
        <form onSubmit={addFriend} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input className="dawa-input" type="email" placeholder="friend@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ flex: 1, minWidth: 200 }} />
          <button type="submit" className="dawa-btn dawa-btn--primary" disabled={loading}>{loading ? 'Sending…' : 'Invite'}</button>
        </form>
        {error && <p className="dawa-error" style={{ marginTop: 12 }}>{error}</p>}
      </div>

      {(data?.requests?.length ?? 0) > 0 && (
        <div className="dawa-panel">
          <h2 className="dawa-panel__title">Pending invitations</h2>
          {data?.requests.map((r) => (
            <div key={r.friendshipId} className="dawa-friend">
              <UserAvatar name={r.name} avatarColor={r.avatarColor} avatarUrl={r.avatarUrl} size={44} />
              <div style={{ flex: 1 }}>
                <div className="dawa-friend__name">{r.name}</div>
                <div className="dawa-friend__meta">{r.email}</div>
              </div>
              <button type="button" className="dawa-btn dawa-btn--primary" style={{ padding: '8px 16px' }} onClick={() => accept(r.friendshipId)}>Accept</button>
            </div>
          ))}
        </div>
      )}

      <div className="dawa-panel">
        <h2 className="dawa-panel__title">Your circle</h2>
        {(data?.friends ?? []).length === 0 && (
          <p style={{ color: 'var(--text-soft)', fontSize: 14 }}>No friends yet — invite someone to walk this path together.</p>
        )}
        {data?.friends.map((f, i) => (
          <motion.div key={f.id} className="dawa-friend" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
            <UserAvatar name={f.name} avatarColor={f.avatarColor} avatarUrl={f.avatarUrl} size={44} />
            <div style={{ flex: 1 }}>
              <div className="dawa-friend__name">{f.name}</div>
              <div className="dawa-friend__meta">This week: {f.weekRate}% salah</div>
            </div>
            <button type="button" className="dawa-poke" onClick={() => poke(f.id)}>Gentle Reminder 🤲</button>
          </motion.div>
        ))}
      </div>
    </>
  );
}
