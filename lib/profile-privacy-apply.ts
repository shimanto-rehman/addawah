import { canView, type ProfilePrivacy, type ProfileViewerContext } from './profile-privacy';

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
  viewer: ProfileViewerContext,
): number | null {
  if (canView(privacy, 'showGoldCoins', viewer)) return goldCoins;
  return null;
}

export function maskWeekRate(
  weekRate: number,
  privacy: ProfilePrivacy,
  viewer: ProfileViewerContext,
): number | null {
  if (canView(privacy, 'showSalahStats', viewer)) return weekRate;
  return null;
}
