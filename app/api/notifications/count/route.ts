import { apiRequireAuth, jsonOk } from '@/lib/api-helpers';
import { countUnreadNotifications, maybeSyncNotificationsForUser } from '@/lib/notifications';

export async function GET() {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  await maybeSyncNotificationsForUser(user!.id);
  const unreadCount = await countUnreadNotifications(user!.id);
  return jsonOk({ unreadCount });
}
