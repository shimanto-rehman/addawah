import { mutate } from 'swr';

export const STATS_KEY = '/api/stats';
export const ANALYTICS_KEY = '/api/analytics';
export const INSIGHTS_KEY = '/api/insights';
export const MOOD_KEY = '/api/mood';

/** Refresh dashboard metrics after salah changes. */
export async function revalidateDashboardMetrics() {
  await Promise.all([
    mutate(STATS_KEY),
    mutate(ANALYTICS_KEY),
    mutate(INSIGHTS_KEY),
  ]);
}

/** Refresh mood + analytics after a mood check-in. */
export async function revalidateMoodAnalytics() {
  await Promise.all([mutate(MOOD_KEY), mutate(ANALYTICS_KEY)]);
}
