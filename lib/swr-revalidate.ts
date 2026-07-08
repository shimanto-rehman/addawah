import { mutate } from 'swr';

export const STATS_KEY = '/api/stats';
export const DASHBOARD_KEY = '/api/dashboard';
export const ANALYTICS_KEY = '/api/analytics';
export const ANALYTICS_SUMMARY_KEY = '/api/analytics/summary';
export const INSIGHTS_KEY = '/api/insights';
export const MOOD_KEY = '/api/mood';
export const CHALLENGE_KEY = '/api/challenge';
export const RUHANIAH_KEY = '/api/ruhaniah';
export const RUHANIAH_HISTORY_KEY = '/api/ruhaniah/history';
export const RUHANIAH_DUAS_KEY = '/api/ruhaniah/duas';

/** Refresh dashboard metrics after salah changes (silent, no shimmer). */
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
    mutate(MOOD_KEY, undefined, { revalidate: true }),
    mutate(DASHBOARD_KEY, undefined, { revalidate: true }),
    mutate(ANALYTICS_KEY, undefined, { revalidate: true }),
    mutate(ANALYTICS_SUMMARY_KEY, undefined, { revalidate: true }),
  ]);
}

/** Refresh Ruhaniah data after nightly submission. */
export async function revalidateRuhaniah() {
  await Promise.all([
    mutate(RUHANIAH_KEY, undefined, { revalidate: true }),
    mutate(RUHANIAH_HISTORY_KEY, undefined, { revalidate: true }),
    mutate(RUHANIAH_DUAS_KEY, undefined, { revalidate: true }),
  ]);
}
