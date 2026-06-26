import { getSessionUser } from '@/lib/auth';
import { jsonOk } from '@/lib/api-helpers';
import { syncNotificationsForUser } from '@/lib/notifications';

export async function GET() {
  const user = await getSessionUser();
  if (user) {
    void syncNotificationsForUser(user.id);
  }
  return jsonOk({ user });
}
