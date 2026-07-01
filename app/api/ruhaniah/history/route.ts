import { apiRequireAuth, jsonOk } from '@/lib/api-helpers';
import { getRuhaniahHistory } from '@/lib/ruhaniah-data';

export async function GET() {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const history = await getRuhaniahHistory(user!.id, 30);
  return jsonOk(history);
}
