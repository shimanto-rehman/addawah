import { logger } from '@/lib/logger';
import { apiRequireAuth, jsonError, jsonOk } from '@/lib/api-helpers';
import { fetchPrayerTimesFor, prayerLocationFromUser } from '@/lib/prayer-times';

export async function GET() {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  // Coords are the source of truth; city/country is the legacy fallback.
  // No location at all → fail closed so the client prompts to set one
  // instead of silently serving Dhaka times.
  const location = prayerLocationFromUser(user!);
  if (!location) {
    return jsonError('Location not set. Please set your city to load prayer times.', 400);
  }


  try {
    const data = await fetchPrayerTimesFor(location);
    return jsonOk(data, 200, {
      'Cache-Control': 'private, max-age=1800, stale-while-revalidate=3600',
    });
  } catch (e) {
    logger.error({ route: '/api/prayer-times', err: e }, 'Could not load prayer times');
    return jsonError('Could not load prayer times', 502);
  }
}
