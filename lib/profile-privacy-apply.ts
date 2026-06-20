import type { ProfilePrivacy } from './profile-privacy';

export function privateWaktRow() {
  return {
    isPrivate: true,
    prayer: null,
    prayerLabel: 'Private',
    phase: 'upcoming',
    salahStatus: 'none',
    waktStartedAt: null,
    waktEndsAt: null,
    canPoke: false,
    elapsedMinutes: 0,
    remainingMinutes: 0,
  };
}

export function maskGoldCoins(
  goldCoins: number,
  privacy: ProfilePrivacy,
  viewerIsSelf: boolean,
): number | null {
  if (viewerIsSelf || privacy.showGoldCoins) return goldCoins;
  return null;
}

export function maskWeekRate(
  weekRate: number,
  privacy: ProfilePrivacy,
  viewerIsSelf: boolean,
): number | null {
  if (viewerIsSelf || privacy.showSalahStats) return weekRate;
  return null;
}
