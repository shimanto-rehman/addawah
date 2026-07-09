import { apiRequireAuth, jsonOk } from '@/lib/api-helpers';
import { buildCalendarPayload } from '@/lib/islamic-calendar';

/** GET /api/calendar — full calendar page payload for the authenticated user */
export async function GET() {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const payload = await buildCalendarPayload(user!.id);
  return jsonOk(payload);
}
