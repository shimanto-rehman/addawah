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

/** Sunnah units per fard — each circle is one unit (typically 2 rakʿah) */
export const SUNNAH_SLOTS: Record<PrayerName, { before: number; after: number }> = {
  FAJR: { before: 1, after: 0 },
  DHUHR: { before: 2, after: 1 },
  ASR: { before: 0, after: 0 },
  MAGHRIB: { before: 0, after: 1 },
  ISHA: { before: 0, after: 1 },
};

/** Fard rakʿah count per prayer */
export const FARD_RAKATS: Record<PrayerName, number> = {
  FAJR: 2,
  DHUHR: 4,
  ASR: 4,
  MAGHRIB: 3,
  ISHA: 4,
};

/** Rakʿah per sunnah circle (one tracked unit) */
export const SUNNAH_UNIT_RAKATS = 2;

export type SalahKind = 'FARD' | 'SUNNAH_BEFORE' | 'SUNNAH_AFTER';

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
export const LANDING_VIDEO_SRC = '/assets/videos/landing.webm';
export const LANDING_VIDEO_MOBILE_SRC = '/assets/videos/landing-mobile.webm';
export const LANDING_VIDEO_MP4_SRC = '/assets/videos/landing.mp4';
export const LANDING_VIDEO_MOBILE_MP4_SRC = '/assets/videos/landing-mobile.mp4';
/** Dispatched when the landing background video is playing or a static fallback is ready. */
export const LANDING_BACKDROP_READY_EVENT = 'landingBackdropReady';
export const GATE_ARCH_SRC = '/assets/images/Gate.webp';
export const TRACKER_CARD_SRC = '/assets/images/tracker-card.svg';
export const CONFETTI_SCRIPT_SRC = '/assets/scripts/confetti.js';

export const DEVELOPER = {
  name: 'S.M. Obaydur Rahman',
  role: 'Lead Developer & Product Owner',
  bio: 'Designed and built Addawah for salah tracking, brotherhood, and spiritual growth in the ummah.',
  photoSrc: '/assets/images/shimanto.jpg',
  portfolioUrl: 'https://www.shimanto.online',
} as const;

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

export const AVATAR_COLORS = [
  '#d4af37',
  '#2eb88a',
  '#3b9eff',
  '#9b7bf7',
  '#b8c5d6',
  '#f06bab',
  '#e85d5d',
  '#3ecf8e',
] as const;

export function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
