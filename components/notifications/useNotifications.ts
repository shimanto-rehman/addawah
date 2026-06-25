import useSWR from 'swr';
import type { AppNotification } from '@/lib/notification-types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export type NotificationsResponse = {
  notifications: AppNotification[];
  unreadCount: number;
};

export function useNotifications(refreshInterval = 60_000) {
  return useSWR<NotificationsResponse>('/api/notifications', fetcher, {
    refreshInterval,
    revalidateOnFocus: true,
  });
}
