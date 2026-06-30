import { getSessionUser } from '@/lib/auth';
import { jsonOk } from '@/lib/api-helpers';
import { triggerSync } from '@/lib/internal-sync';

export async function GET() {
  const user = await getSessionUser();
  if (user) {
    triggerSync('sync-notifications', user.id);
  }
  return jsonOk({ user });
}
