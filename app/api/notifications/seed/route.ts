import { apiRequireAuth, jsonError, jsonOk } from '@/lib/api-helpers';
import { listNotifications, seedSampleNotifications } from '@/lib/notifications';

export async function POST() {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  try {
    const result = await seedSampleNotifications(user!.id);
    const data = await listNotifications(user!.id);
    return jsonOk({ ...result, ...data });
  } catch (e) {
    console.error(e);
    return jsonError('Could not seed sample notifications', 500);
  }
}
