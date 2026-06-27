import useSWR from 'swr';
import type { AppNotification } from '@/lib/notification-types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export type NotificationsResponse = {
  notifications: AppNotification[];
  unreadCount: number;
};

export type NotificationCountResponse = {
  unreadCount: number;
};

export function useNotificationCount(refreshInterval = 60_000) {
  return useSWR<NotificationCountResponse>('/api/notifications/count', fetcher, {
    refreshInterval,
    revalidateOnFocus: true,
  });
}

export function useNotifications(refreshInterval = 60_000) {
  return useSWR<NotificationsResponse>('/api/notifications', fetcher, {
    refreshInterval,
    revalidateOnFocus: true,
  });
}
