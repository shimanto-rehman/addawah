import { apiRequireAuth, jsonOk } from '@/lib/api-helpers';
import { ANALYTICS_CACHE_HEADERS, buildAnalyticsPayload } from '@/lib/analytics-data';

export async function GET() {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const payload = await buildAnalyticsPayload(user!.id);
  const { revision: _revision, ...data } = payload;
  return jsonOk(data, 200, ANALYTICS_CACHE_HEADERS);
}
