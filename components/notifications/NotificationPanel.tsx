'use client';

import { useRouter } from 'next/navigation';
import { notificationIcon } from '@/lib/notification-types';
import type { AppNotification } from '@/lib/notification-types';
import { useNotifications } from '@/components/notifications/useNotifications';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function displayTime(item: AppNotification) {
  const label = item.meta.eventTimeLabel;
  if (typeof label === 'string' && label.length > 0) return label;
  return new Date(item.createdAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

type NotificationPanelProps = {
  variant: 'dropdown' | 'page';
  onClose?: () => void;
};

export function NotificationPanel({ variant, onClose }: NotificationPanelProps) {
  const router = useRouter();
  const { data, mutate, isLoading } = useNotifications(variant === 'page' ? 30_000 : 30_000);
  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  async function markAllRead() {
    if (unreadCount === 0) return;
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'read_all' }),
    });
    mutate();
  }

  async function openNotification(id: string, href: string) {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'read', notificationId: id }),
    });
    mutate();
    onClose?.();
    router.push(href);
  }

  return (
    <div className={`dawa-notif-panel dawa-notif-panel--${variant}`}>
      <div className="dawa-notif-panel__head">
        <div>
          <h2 className="dawa-notif-panel__title">Notifications</h2>
          <p className="dawa-notif-panel__sub">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button type="button" className="dawa-notif-panel__mark-all" onClick={() => void markAllRead()}>
            Mark all read
          </button>
        )}
      </div>

      {isLoading && notifications.length === 0 ? (
        <p className="dawa-notif-panel__empty">Loading notifications…</p>
      ) : notifications.length === 0 ? (
        <div className="dawa-notif-panel__empty">
          <span className="dawa-notif-panel__empty-icon" aria-hidden>
            🌙
          </span>
          <p>No notifications yet</p>
          <span>Dawah, connections, and wakt reminders will appear here.</span>
        </div>
      ) : (
        <ul className="dawa-notif-panel__list">
          {notifications.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`dawa-notif-item${item.readAt ? '' : ' is-unread'}`}
                onClick={() => void openNotification(item.id, item.href)}
              >
                <span className={`dawa-notif-item__icon dawa-notif-item__icon--${item.type.toLowerCase()}`}>
                  {notificationIcon(item.type)}
                </span>
                <span className="dawa-notif-item__body">
                  <span className="dawa-notif-item__title">{item.title}</span>
                  <span className="dawa-notif-item__text">{item.body}</span>
                  <span className="dawa-notif-item__time">
                    {displayTime(item)} · {timeAgo(item.createdAt)}
                  </span>
                </span>
                {!item.readAt && <span className="dawa-notif-item__dot" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
