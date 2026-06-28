import { mutate } from 'swr';

export const STATS_KEY = '/api/stats';
export const DASHBOARD_KEY = '/api/dashboard';
export const ANALYTICS_KEY = '/api/analytics';
export const ANALYTICS_SUMMARY_KEY = '/api/analytics/summary';
export const INSIGHTS_KEY = '/api/insights';
export const MOOD_KEY = '/api/mood';

/** Refresh dashboard metrics after salah changes. */
export async function revalidateDashboardMetrics() {
  await Promise.all([
    mutate(STATS_KEY),
    mutate(DASHBOARD_KEY),
    mutate(ANALYTICS_KEY),
    mutate(ANALYTICS_SUMMARY_KEY),
    mutate(INSIGHTS_KEY),
  ]);
}

/** Refresh mood + analytics after a mood check-in. */
export async function revalidateMoodAnalytics() {
  await Promise.all([
    mutate(MOOD_KEY),
    mutate(DASHBOARD_KEY),
    mutate(ANALYTICS_KEY),
    mutate(ANALYTICS_SUMMARY_KEY),
  ]);
}
