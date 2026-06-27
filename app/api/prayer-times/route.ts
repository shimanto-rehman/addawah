import { apiRequireAuth, jsonError, jsonOk } from '@/lib/api-helpers';
import { fetchPrayerTimes } from '@/lib/prayer-times';

export async function GET() {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const city = user!.city?.trim() || 'Dhaka';
  const country = user!.country?.trim() || 'Bangladesh';

  try {
    const data = await fetchPrayerTimes(city, country);
    return jsonOk(data, 200, {
      'Cache-Control': 'private, max-age=1800, stale-while-revalidate=3600',
    });
  } catch (e) {
    console.error(e);
    return jsonError('Could not load prayer times', 502);
  }
}
