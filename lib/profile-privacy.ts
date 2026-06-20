export const PROFILE_PRIVACY_KEYS = [
  'showLocation',
  'showSalahStats',
  'showGoldCoins',
  'showBadge',
  'showWaktStatus',
  'showMemberSince',
  'showAvatarPhoto',
] as const;

export type ProfilePrivacyKey = (typeof PROFILE_PRIVACY_KEYS)[number];
export type ProfilePrivacy = Record<ProfilePrivacyKey, boolean>;

export const DEFAULT_PROFILE_PRIVACY: ProfilePrivacy = {
  showLocation: true,
  showSalahStats: true,
  showGoldCoins: true,
  showBadge: true,
  showWaktStatus: true,
  showMemberSince: true,
  showAvatarPhoto: true,
};

export const PROFILE_PRIVACY_META: Record<
  ProfilePrivacyKey,
  { label: string; description: string }
> = {
  showLocation: {
    label: 'Location',
    description: 'City and country on your public profile',
  },
  showSalahStats: {
    label: 'Salah statistics',
    description: 'Weekly rate, streak, and lifetime stats on your profile',
  },
  showGoldCoins: {
    label: 'Gold coins',
    description: 'Coin balance shown to connections and on your profile',
  },
  showBadge: {
    label: 'Badge tier',
    description: 'Your earned badge name and icon',
  },
  showWaktStatus: {
    label: 'Live wakt status',
    description: 'Prayer activity on the friends Wakt board',
  },
  showMemberSince: {
    label: 'Member since',
    description: 'When you joined Addawah',
  },
  showAvatarPhoto: {
    label: 'Profile photo',
    description: 'Uploaded photo (initials silhouette still shown when off)',
  },
};

export function parseProfilePrivacy(raw: unknown): ProfilePrivacy {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_PROFILE_PRIVACY };
  }
  const obj = raw as Record<string, unknown>;
  const privacy = { ...DEFAULT_PROFILE_PRIVACY };
  for (const key of PROFILE_PRIVACY_KEYS) {
    if (typeof obj[key] === 'boolean') privacy[key] = obj[key];
  }
  return privacy;
}

export function privacyPatchSchema(raw: unknown): Partial<ProfilePrivacy> | null {
  if (raw === undefined) return null;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const patch: Partial<ProfilePrivacy> = {};
  for (const key of PROFILE_PRIVACY_KEYS) {
    if (typeof obj[key] === 'boolean') patch[key] = obj[key];
  }
  return Object.keys(patch).length ? patch : null;
}

export function mergeProfilePrivacy(
  current: ProfilePrivacy,
  patch: Partial<ProfilePrivacy> | null,
): ProfilePrivacy {
  if (!patch) return current;
  return { ...current, ...patch };
}

export function canView(
  privacy: ProfilePrivacy,
  key: ProfilePrivacyKey,
  viewerIsSelf: boolean,
) {
  return viewerIsSelf || privacy[key];
}
