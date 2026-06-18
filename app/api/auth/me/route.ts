import { getSessionUser } from '@/lib/auth';
import { jsonOk } from '@/lib/api-helpers';

export async function GET() {
  const user = await getSessionUser();
  return jsonOk({ user });
}
