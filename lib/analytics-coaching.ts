import { PRAYER_LABELS, PRAYERS, type PrayerName } from './constants';
import type { PrayerInsightsPayload } from './prayer-insights';

export type CoachingTip = {
  id: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
  title: string;
  body: string;
  action: string;
};

type CoachingInput = {
  insights: PrayerInsightsPayload;
  streak: number;
  fajrMissed: number;
  weekRate: number;
  bestPrayer: { prayer: PrayerName; label: string; rate: number } | null;
  weakestPrayer: { prayer: PrayerName; label: string; rate: number } | null;
  perfectDays: number;
  moodTrend?: string | null;
};

export function buildCoachingTips(input: CoachingInput): CoachingTip[] {
  const tips: CoachingTip[] = [];
  const { insights, streak, fajrMissed, weekRate, bestPrayer, weakestPrayer, perfectDays } = input;

  if (fajrMissed >= 3) {
    tips.push({
      id: 'fajr',
      priority: 'high',
      icon: '🌅',
      title: 'Guard your Fajr window',
      body: `Fajr has been missed ${fajrMissed} times since you joined. Set a gentle alarm 10 minutes before adhan and lay out your prayer mat the night before.`,
      action: 'Try sleeping 30 minutes earlier tonight',
    });
  }

  if (weakestPrayer && weakestPrayer.rate < 70) {
    tips.push({
      id: 'weakest',
      priority: 'high',
      icon: '🎯',
      title: `${weakestPrayer.label} needs attention`,
      body: `${weakestPrayer.label} is your lowest completion rate at ${weakestPrayer.rate}%. Block a recurring reminder 15 minutes before its wakt ends.`,
      action: `Focus on ${weakestPrayer.label} for the next 7 days`,
    });
  }

  if (insights.totals.kaza > insights.totals.onTime) {
    tips.push({
      id: 'kaza',
      priority: 'high',
      icon: '⏰',
      title: 'Shift from kaza to wakt',
      body: 'You are logging more kaza than on-time prayers. Aim to pray at the start of each wakt — even 5 minutes earlier compounds over weeks.',
      action: 'Pray the next fard within the first third of wakt',
    });
  }

  if (insights.trend === 'down') {
    tips.push({
      id: 'trend',
      priority: 'medium',
      icon: '📉',
      title: 'Your iman curve is dipping',
      body: 'Recent days show more missed or late salahs. Review yesterday evening — reduce screens after Isha and prep for Fajr.',
      action: 'Log today\'s prayers before maghrib if possible',
    });
  } else if (insights.trend === 'up') {
    tips.push({
      id: 'trend-up',
      priority: 'low',
      icon: '📈',
      title: 'Momentum is on your side',
      body: 'Your wakt consistency is improving. Protect this streak by keeping the same pre-prayer habits that worked this week.',
      action: 'Maintain your current routine',
    });
  }

  if (streak >= 3) {
    tips.push({
      id: 'streak',
      priority: 'medium',
      icon: '🔥',
      title: `${streak}-day active streak`,
      body: 'Consistency builds taqwa. Do not break the chain today — even one fard in wakt keeps the habit alive.',
      action: 'Complete at least 3 fard today in wakt',
    });
  } else if (streak === 0) {
    tips.push({
      id: 'restart',
      priority: 'medium',
      icon: '🌱',
      title: 'Fresh start today',
      body: 'No active streak right now — that is okay. Pick one prayer to nail in wakt today and rebuild from there.',
      action: 'Start with Dhuhr or Maghrib today',
    });
  }

  if (weekRate < 60) {
    tips.push({
      id: 'week',
      priority: 'medium',
      icon: '📊',
      title: 'This week is below 60%',
      body: `You are at ${weekRate}% fard completion this week. Pair each salah with a fixed cue — after a meal, before leaving work, or right at adhan.`,
      action: 'Set phone reminders for all 5 prayers',
    });
  }

  if (perfectDays >= 2 && perfectDays < 7) {
    tips.push({
      id: 'perfect',
      priority: 'low',
      icon: '✨',
      title: `${perfectDays} perfect days logged`,
      body: 'A perfect day means all five fard in wakt. You have done this before — aim for one more this week.',
      action: 'Target a perfect day before Friday',
    });
  }

  if (bestPrayer && bestPrayer.rate >= 85) {
    tips.push({
      id: 'strength',
      priority: 'low',
      icon: '💎',
      title: `${bestPrayer.label} is your anchor`,
      body: `${bestPrayer.label} at ${bestPrayer.rate}% shows discipline. Use the same pre-prayer routine for your weaker prayers.`,
      action: `Mirror your ${bestPrayer.label} habit for Fajr`,
    });
  }

  if (insights.totals.missed >= 5) {
    tips.push({
      id: 'missed',
      priority: 'high',
      icon: '🤲',
      title: 'Close the gaps',
      body: `${insights.totals.missed} missed fard in the last 14 days. If you miss wakt, log kaza the same day — unlogged gaps become habits.`,
      action: 'Make up one missed prayer today if able',
    });
  }

  const order = { high: 0, medium: 1, low: 2 };
  return tips
    .sort((a, b) => order[a.priority] - order[b.priority])
    .slice(0, 6);
}

export function prayerRateLabel(rate: number) {
  if (rate >= 90) return 'Excellent';
  if (rate >= 75) return 'Strong';
  if (rate >= 55) return 'Building';
  return 'Needs focus';
}

export function summarizeWeakest(
  byPrayer: { prayer: PrayerName; rate: number; total: number }[],
) {
  const withData = byPrayer.filter((p) => p.total > 0);
  if (!withData.length) return null;
  const weakest = withData.reduce((a, b) => (a.rate <= b.rate ? a : b));
  return {
    prayer: weakest.prayer,
    label: PRAYER_LABELS[weakest.prayer],
    rate: weakest.rate,
  };
}

export function summarizeBest(
  byPrayer: { prayer: PrayerName; rate: number; total: number }[],
) {
  const withData = byPrayer.filter((p) => p.total > 0);
  if (!withData.length) return null;
  const best = withData.reduce((a, b) => (a.rate >= b.rate ? a : b));
  return {
    prayer: best.prayer,
    label: PRAYER_LABELS[best.prayer],
    rate: best.rate,
  };
}
