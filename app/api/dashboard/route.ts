import { apiRequireAuth, jsonOk } from '@/lib/api-helpers';
import { buildDashboardPayload } from '@/lib/dashboard-data';

export async function GET() {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const payload = await buildDashboardPayload(user!.id);
  return jsonOk(payload, 200);
}
