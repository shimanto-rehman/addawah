import { getSessionUser } from '@/lib/auth';
import { jsonOk } from '@/lib/api-helpers';
import { maybeSyncNotificationsForUser } from '@/lib/notifications';

export async function GET() {
  const user = await getSessionUser();
  if (user) {
    void maybeSyncNotificationsForUser(user.id);
  }
  return jsonOk({ user });
}
