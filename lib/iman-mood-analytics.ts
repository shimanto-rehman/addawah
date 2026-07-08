import { moodById, moodScore } from './moods';

export type ImanMoodDay = {
  date: string;
  label: string;
  iman: number;
  onTime: number;
  kaza: number;
  missed: number;
  moodId: string | null;
  moodLabel: string | null;
  moodScore: number | null;
  moodColor: string | null;
  /** Daily challenge tasks completed that day (0–5), or null if no data. */
  deeds: number | null;
};

export function pearsonCorrelation(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 2) return null;

  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i += 1) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const den = Math.sqrt(denX * denY);
  return den === 0 ? null : num / den;
}

export function describeImanMoodCorrelation(r: number | null): string {
  if (r == null) return 'Log more moods and prayers to reveal a pattern.';
  const abs = Math.abs(r);
  if (abs >= 0.7) return r > 0 ? 'Strong positive link' : 'Strong inverse link';
  if (abs >= 0.4) return r > 0 ? 'Moderate positive link' : 'Moderate inverse link';
  if (abs >= 0.2) return 'Mild pattern emerging';
  return 'No clear link yet — keep checking in';
}

export function buildImanMoodSeries(
  days: {
    date: string;
    label: string;
    iman: number;
    onTime: number;
    kaza: number;
    missed: number;
  }[],
  moods: { date: Date; moodId: string }[],
  formatDateKey: (d: Date) => string,
  /** Optional daily-challenge completion (deeds) keyed by UTC date string. */
  deedsByDate?: Map<string, number>,
): { series: ImanMoodDay[]; correlation: number | null } {
  const moodByDate = new Map(moods.map((m) => [formatDateKey(m.date), m.moodId]));

  const series: ImanMoodDay[] = days.map((d) => {
    const moodId = moodByDate.get(d.date) ?? null;
    const mood = moodId ? moodById(moodId) : null;
    return {
      date: d.date,
      label: d.label,
      iman: d.iman,
      onTime: d.onTime,
      kaza: d.kaza,
      missed: d.missed,
      moodId,
      moodLabel: mood?.label ?? null,
      moodScore: moodId ? moodScore(moodId) : null,
      moodColor: mood?.color ?? null,
      deeds: deedsByDate?.get(d.date) ?? null,
    };
  });

  const paired = series.filter((d) => d.moodScore != null);
  const correlation = pearsonCorrelation(
    paired.map((d) => d.moodScore!),
    paired.map((d) => d.iman),
  );

  return { series, correlation };
}
