import { apiRequireAuth, jsonOk } from '@/lib/api-helpers';
import { buildDashboardPayload } from '@/lib/dashboard-data';
import { DASHBOARD_CACHE_HEADERS } from '@/lib/salah-query';

export async function GET() {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const payload = await buildDashboardPayload(user!.id);
  return jsonOk(payload, 200, DASHBOARD_CACHE_HEADERS);
}
