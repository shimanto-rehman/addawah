import { prisma } from '@/lib/prisma';
import { apiRequireAuth, jsonError, jsonOk } from '@/lib/api-helpers';
import { isValidMoodId, moodById } from '@/lib/moods';
import { formatDateKey, startOfDay } from '@/lib/salah-utils';
import { DASHBOARD_CACHE_HEADERS } from '@/lib/salah-query';
import { logger } from '@/lib/logger';

export async function GET() {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const today = startOfDay(new Date());
  const checkIn = await prisma.moodCheckIn.findUnique({
    where: { userId_date: { userId: user!.id, date: today } },
  });

  const mood = checkIn ? moodById(checkIn.moodId) : null;
  return jsonOk(
    {
      today: checkIn
        ? { moodId: checkIn.moodId, label: mood?.label, date: formatDateKey(today) }
        : null,
    },
    200,
    DASHBOARD_CACHE_HEADERS,
  );
}

export async function POST(req: Request) {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const moodId = String(body.moodId ?? '');
    if (!isValidMoodId(moodId)) return jsonError('Invalid mood', 400);

    const today = startOfDay(new Date());
    const checkIn = await prisma.moodCheckIn.upsert({
      where: { userId_date: { userId: user!.id, date: today } },
      create: { userId: user!.id, moodId, date: today },
      update: { moodId },
    });

    const mood = moodById(checkIn.moodId);
    return jsonOk({
      today: {
        moodId: checkIn.moodId,
        label: mood?.label,
        date: formatDateKey(today),
      },
    });
  } catch (e) {
    logger.error({ route: '/api/mood', err: e }, 'Could not save mood');
    return jsonError('Could not save mood', 500);
  }
}
