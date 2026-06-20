'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import type { ConnectionStatus } from '@/lib/friendship';

type ConnectionActionsProps = {
  status: ConnectionStatus;
  friendshipId: string | null;
  targetName: string;
  targetUserId?: string;
  targetUsername?: string | null;
  size?: 'sm' | 'md';
  onChanged?: () => void;
};

type PendingModal =
  | { type: 'connect' }
  | { type: 'disconnect' }
  | { type: 'cancel' }
  | { type: 'decline' }
  | { type: 'accept' }
  | null;

export function ConnectionActions({
  status,
  friendshipId,
  targetName,
  targetUserId,
  targetUsername,
  size = 'md',
  onChanged,
}: ConnectionActionsProps) {
  const router = useRouter();
  const [modal, setModal] = useState<PendingModal>(null);
  const [busy, setBusy] = useState(false);
  const btnClass = size === 'sm' ? 'dawa-btn dawa-btn--sm' : 'dawa-btn';

  async function runAction(action: 'connect' | 'accept' | 'disconnect' | 'cancel' | 'decline') {
    setBusy(true);
    try {
      if (action === 'connect') {
        const body = targetUserId
          ? { userId: targetUserId }
          : { username: targetUsername ?? '' };
        const res = await fetch('/api/friends', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || 'Could not connect');
        }
      } else {
        const res = await fetch('/api/friends', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ friendshipId, action }),
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || 'Action failed');
        }
      }
      setModal(null);
      onChanged?.();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (status === 'self') {
    return (
      <a href="/profile" className={`${btnClass} dawa-btn--outline`}>
        Edit profile
      </a>
    );
  }

  return (
    <>
      <div className="dawa-connection-actions">
        {status === 'none' && (
          <button
            type="button"
            className={`${btnClass} dawa-btn--primary`}
            onClick={() => setModal({ type: 'connect' })}
          >
            Connect
          </button>
        )}
        {status === 'connected' && (
          <button
            type="button"
            className={`${btnClass} dawa-btn--outline dawa-btn--danger-outline`}
            onClick={() => setModal({ type: 'disconnect' })}
          >
            Disconnect
          </button>
        )}
        {status === 'pending_sent' && (
          <>
            <span className="dawa-connection-actions__pending">Request sent</span>
            <button
              type="button"
              className={`${btnClass} dawa-btn--outline dawa-btn--danger-outline`}
              onClick={() => setModal({ type: 'cancel' })}
            >
              Cancel request
            </button>
          </>
        )}
        {status === 'pending_received' && (
          <>
            <button
              type="button"
              className={`${btnClass} dawa-btn--primary`}
              onClick={() => setModal({ type: 'accept' })}
            >
              Accept
            </button>
            <button
              type="button"
              className={`${btnClass} dawa-btn--outline dawa-btn--danger-outline`}
              onClick={() => setModal({ type: 'decline' })}
            >
              Decline
            </button>
          </>
        )}
      </div>

      <ConfirmModal
        open={modal?.type === 'connect'}
        title="Send connect request?"
        message={`Send a connection request to ${targetName}? They can accept when ready.`}
        confirmLabel="Send request"
        busy={busy}
        onConfirm={() => runAction('connect')}
        onCancel={() => setModal(null)}
      />

      <ConfirmModal
        open={modal?.type === 'accept'}
        title="Accept connection?"
        message={`Accept ${targetName}'s connection request? You'll see each other's salah activity on the Wakt board.`}
        confirmLabel="Accept"
        busy={busy}
        onConfirm={() => runAction('accept')}
        onCancel={() => setModal(null)}
      />

      <ConfirmModal
        open={modal?.type === 'disconnect'}
        title="Disconnect?"
        message={`Remove ${targetName} from your connections? You can connect again later.`}
        confirmLabel="Disconnect"
        tone="danger"
        busy={busy}
        onConfirm={() => runAction('disconnect')}
        onCancel={() => setModal(null)}
      />

      <ConfirmModal
        open={modal?.type === 'cancel'}
        title="Cancel request?"
        message={`Cancel your pending connection request to ${targetName}?`}
        confirmLabel="Cancel request"
        tone="danger"
        busy={busy}
        onConfirm={() => runAction('cancel')}
        onCancel={() => setModal(null)}
      />

      <ConfirmModal
        open={modal?.type === 'decline'}
        title="Decline request?"
        message={`Decline ${targetName}'s connection request?`}
        confirmLabel="Decline"
        tone="danger"
        busy={busy}
        onConfirm={() => runAction('decline')}
        onCancel={() => setModal(null)}
      />
    </>
  );
}
