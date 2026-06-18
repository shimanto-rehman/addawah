export const SITE_NAME = 'Addawah';
export const SITE_TAGLINE = 'Pray Together. Grow Together. Inspire Each Other.';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const PRAYERS = ['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA'] as const;
export type PrayerName = (typeof PRAYERS)[number];

export const PRAYER_LABELS: Record<PrayerName, string> = {
  FAJR: 'Fajr',
  DHUHR: 'Dhuhr',
  ASR: 'Asr',
  MAGHRIB: 'Maghrib',
  ISHA: 'Isha',
};

export const PRAYER_ARABIC: Record<PrayerName, string> = {
  FAJR: 'الفجر',
  DHUHR: 'الظهر',
  ASR: 'العصر',
  MAGHRIB: 'المغرب',
  ISHA: 'العشاء',
};

export const THEME_COLORS = ['green', 'blue', 'gold', 'purple', 'silver', 'pink'] as const;
export type ThemeColor = (typeof THEME_COLORS)[number];

export const THEME_COLOR_LABELS: Record<ThemeColor, string> = {
  green: 'Emerald',
  blue: 'Sapphire',
  gold: 'Gold',
  purple: 'Amethyst',
  silver: 'Silver',
  pink: 'Rose',
};

export const SITE_LOGO_SRC = '/assets/images/Logo.webp';
export const LANDING_HERO_SRC = '/assets/images/landing.webp';
export const GATE_ARCH_SRC = '/assets/images/Gate.webp';

export const DAILY_INSPIRATIONS = [
  {
    text: 'Verily, with hardship comes ease.',
    ref: 'Qur\'an 94:6',
  },
  {
    text: 'The most beloved deeds to Allah are those done consistently, even if small.',
    ref: 'Sahih Bukhari',
  },
  {
    text: 'Whoever follows a path in pursuit of knowledge, Allah will make easy for him a path to Paradise.',
    ref: 'Sahih Muslim',
  },
  {
    text: 'The best among you are those who have the best manners and character.',
    ref: 'Sahih Bukhari',
  },
  {
    text: 'Do not lose hope, nor be sad. You will be superior if you are true believers.',
    ref: 'Qur\'an 3:139',
  },
  {
    text: 'Allah does not burden a soul beyond that it can bear.',
    ref: 'Qur\'an 2:286',
  },
  {
    text: 'Remember Me, and I will remember you. Be grateful to Me and do not deny Me.',
    ref: 'Qur\'an 2:152',
  },
];

export function getDailyInspiration(date = new Date()) {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return DAILY_INSPIRATIONS[dayOfYear % DAILY_INSPIRATIONS.length];
}

export function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
