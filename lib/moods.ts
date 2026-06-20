export type MoodVariant = 'ecstatic' | 'happy' | 'good' | 'neutral' | 'sad' | 'angry';

export type MoodOption = {
  id: string;
  label: string;
  color: string;
  variant: MoodVariant;
};

/** Six-step scale — positive (green) → negative (red), single-row check-in. */
export const MOOD_OPTIONS: MoodOption[] = [
  { id: 'ecstatic', label: 'Ecstatic', color: '#2d8a4e', variant: 'ecstatic' },
  { id: 'happy', label: 'Happy', color: '#5cb85c', variant: 'happy' },
  { id: 'good', label: 'Good', color: '#9ccc65', variant: 'good' },
  { id: 'neutral', label: 'Neutral', color: '#e8c547', variant: 'neutral' },
  { id: 'sad', label: 'Sad', color: '#f0a030', variant: 'sad' },
  { id: 'angry', label: 'Upset', color: '#c0392b', variant: 'angry' },
];

export const MOOD_IDS = MOOD_OPTIONS.map((m) => m.id);

/** Maps legacy emoji-era mood ids to the new scale. */
const LEGACY_MOOD_MAP: Record<string, string> = {
  grateful: 'ecstatic',
  peaceful: 'happy',
  hopeful: 'good',
  motivated: 'ecstatic',
  reflective: 'neutral',
  tired: 'sad',
  stressed: 'angry',
  low: 'sad',
};

export function moodById(id: string) {
  const direct = MOOD_OPTIONS.find((m) => m.id === id);
  if (direct) return direct;
  const mapped = LEGACY_MOOD_MAP[id];
  return mapped ? MOOD_OPTIONS.find((m) => m.id === mapped) : undefined;
}

export function isValidMoodId(id: string) {
  return MOOD_IDS.includes(id);
}

/** 1 = lowest mood, 6 = highest — for charts vs iman. */
export function moodScore(id: string): number | null {
  const mood = moodById(id);
  if (!mood) return null;
  const idx = MOOD_OPTIONS.findIndex((m) => m.id === mood.id);
  return idx >= 0 ? MOOD_OPTIONS.length - idx : null;
}
