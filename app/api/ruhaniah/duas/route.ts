import { apiRequireAuth, jsonOk, jsonError } from '@/lib/api-helpers';
import { getActiveDuas, getDuaStats } from '@/lib/ruhaniah-data';
import { prisma } from '@/lib/prisma';
import { startOfDay } from '@/lib/salah-utils';

const VALID_STATUSES = ['WAITING', 'ANSWERED_SAME', 'ANSWERED_DIFFERENT', 'STORED_AKHIRAH'];

export async function GET() {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const [duas, stats] = await Promise.all([
    getActiveDuas(user!.id),
    getDuaStats(user!.id),
  ]);

  return jsonOk({ duas, stats });
}

/** PATCH — Update dua status */
export async function PATCH(req: Request) {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  let body: { id?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  if (!body.id || !body.status) {
    return jsonError('id and status are required', 400);
  }

  if (!VALID_STATUSES.includes(body.status)) {
    return jsonError(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`, 400);
  }

  // Verify the dua belongs to the user
  const dua = await prisma.duaEntry.findFirst({
    where: { id: body.id, userId: user!.id },
    select: { id: true },
  });

  if (!dua) {
    return jsonError('Dua not found', 404);
  }

  const isAnswered = body.status === 'ANSWERED_SAME' || body.status === 'ANSWERED_DIFFERENT';

  await prisma.duaEntry.update({
    where: { id: body.id },
    data: {
      status: body.status,
      dateResolved: isAnswered ? startOfDay(new Date()) : null,
    },
  });

  return jsonOk({ updated: true });
}
