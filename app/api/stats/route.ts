import { apiRequireAuth, jsonOk } from '@/lib/api-helpers';
import { buildStatsPayload } from '@/lib/stats-data';

export async function GET() {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const payload = await buildStatsPayload(user!.id);
  return jsonOk(payload, 200);
}
