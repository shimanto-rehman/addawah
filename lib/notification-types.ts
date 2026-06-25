export type NotificationKind =
  | 'DAWAH_POKE'
  | 'CONNECTION_REQUEST'
  | 'CONNECTION_ACCEPTED'
  | 'WAKT_REMINDER';

export type AppNotification = {
  id: string;
  type: NotificationKind;
  title: string;
  body: string;
  href: string;
  meta: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

export function notificationIcon(type: NotificationKind) {
  switch (type) {
    case 'DAWAH_POKE':
      return '🤲';
    case 'CONNECTION_REQUEST':
      return '👋';
    case 'CONNECTION_ACCEPTED':
      return '✅';
    case 'WAKT_REMINDER':
      return '⏳';
    default:
      return '🔔';
  }
}
