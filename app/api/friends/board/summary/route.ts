import { apiRequireAuth, jsonOk } from '@/lib/api-helpers';
import { buildBoardSummary } from '@/lib/friends-hub';

export async function GET() {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const summary = await buildBoardSummary(user!.id);
  return jsonOk(summary);
}
