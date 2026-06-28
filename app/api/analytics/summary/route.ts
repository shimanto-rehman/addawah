import { apiRequireAuth, jsonOk } from '@/lib/api-helpers';
import {
  ANALYTICS_CACHE_HEADERS,
  buildAnalyticsSummaryFast,
} from '@/lib/analytics-data';

export async function GET() {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const payload = await buildAnalyticsSummaryFast(user!.id);
  return jsonOk(payload, 200, ANALYTICS_CACHE_HEADERS);
}
