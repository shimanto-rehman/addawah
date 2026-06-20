import { AVATAR_COLORS, PRAYER_LABELS, type PrayerName } from './constants';
import type { FriendWaktPhase } from './friends-wakt';

export type DemoBoardRow = {
  id: string;
  name: string;
  username: string;
  avatarColor: string;
  avatarUrl?: string | null;
  goldCoins: number;
  badge: { id: string; name: string; minCoins: number; icon: string; blurb: string };
  wakt: {
    prayer: PrayerName | null;
    prayerLabel: string;
    phase: FriendWaktPhase;
    salahStatus: string;
    waktStartedAt: string | null;
    waktEndsAt: string | null;
    canPoke: boolean;
    elapsedMinutes: number;
    remainingMinutes: number;
  };
};

/** Demo rows for the wakt board — mixed statuses for preview */
export const DEMO_BOARD_ROWS: DemoBoardRow[] = [
  {
    id: 'demo-yusuf',
    name: 'Yusuf Ahmed',
    username: 'yusuf_a',
    avatarColor: AVATAR_COLORS[1],
    goldCoins: 142,
    badge: { id: 'guardian', name: 'Wakt Guardian', minCoins: 50, icon: '🛡️', blurb: 'Steady in prayer time' },
    wakt: {
      prayer: 'DHUHR',
      prayerLabel: PRAYER_LABELS.DHUHR,
      phase: 'active',
      salahStatus: 'pending',
      waktStartedAt: null,
      waktEndsAt: null,
      canPoke: true,
      elapsedMinutes: 18,
      remainingMinutes: 34,
    },
  },
  {
    id: 'demo-omar',
    name: 'Omar Hassan',
    username: 'omar_h',
    avatarColor: AVATAR_COLORS[2],
    goldCoins: 88,
    badge: { id: 'seedling', name: 'Seedling', minCoins: 0, icon: '🌱', blurb: 'Beginning the journey' },
    wakt: {
      prayer: 'DHUHR',
      prayerLabel: PRAYER_LABELS.DHUHR,
      phase: 'active',
      salahStatus: 'pending',
      waktStartedAt: null,
      waktEndsAt: null,
      canPoke: true,
      elapsedMinutes: 22,
      remainingMinutes: 30,
    },
  },
  {
    id: 'demo-fatima',
    name: 'Fatima Khan',
    username: 'fatima_k',
    avatarColor: AVATAR_COLORS[5],
    goldCoins: 210,
    badge: { id: 'lighthouse', name: 'Lighthouse', minCoins: 150, icon: '🕌', blurb: 'A light for others' },
    wakt: {
      prayer: 'DHUHR',
      prayerLabel: PRAYER_LABELS.DHUHR,
      phase: 'prayed',
      salahStatus: 'on-time',
      waktStartedAt: null,
      waktEndsAt: null,
      canPoke: false,
      elapsedMinutes: 8,
      remainingMinutes: 44,
    },
  },
  {
    id: 'demo-ibrahim',
    name: 'Ibrahim Malik',
    username: 'ibrahim_m',
    avatarColor: AVATAR_COLORS[3],
    goldCoins: 56,
    badge: { id: 'seedling', name: 'Seedling', minCoins: 0, icon: '🌱', blurb: 'Beginning the journey' },
    wakt: {
      prayer: 'ASR',
      prayerLabel: PRAYER_LABELS.ASR,
      phase: 'upcoming',
      salahStatus: 'none',
      waktStartedAt: null,
      waktEndsAt: null,
      canPoke: false,
      elapsedMinutes: 0,
      remainingMinutes: 47,
    },
  },
  {
    id: 'demo-aisha',
    name: 'Aisha Rahman',
    username: 'aisha_r',
    avatarColor: AVATAR_COLORS[6],
    goldCoins: 320,
    badge: { id: 'mentor', name: 'Dawah Mentor', minCoins: 350, icon: '📿', blurb: 'Uplifts the ummah' },
    wakt: {
      prayer: 'FAJR',
      prayerLabel: PRAYER_LABELS.FAJR,
      phase: 'passed',
      salahStatus: 'missed',
      waktStartedAt: null,
      waktEndsAt: null,
      canPoke: false,
      elapsedMinutes: 0,
      remainingMinutes: 0,
    },
  },
];

export function isDemoFriendId(id: string) {
  return id.startsWith('demo-');
}
