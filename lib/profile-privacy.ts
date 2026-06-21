import type { ConnectionStatus } from './friendship';

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
export type ProfilePrivacyTier = Record<ProfilePrivacyKey, boolean>;
export type ProfilePrivacyAudience = keyof ProfilePrivacy;

export type ProfilePrivacy = {
  public: ProfilePrivacyTier;
  connections: ProfilePrivacyTier;
};

export type ProfileViewerContext = 'self' | 'connection' | 'public';

export const DEFAULT_PROFILE_PRIVACY_TIER: ProfilePrivacyTier = {
  showLocation: true,
  showSalahStats: true,
  showGoldCoins: true,
  showBadge: true,
  showWaktStatus: true,
  showMemberSince: true,
  showAvatarPhoto: true,
};

export const DEFAULT_PROFILE_PRIVACY: ProfilePrivacy = {
  public: { ...DEFAULT_PROFILE_PRIVACY_TIER },
  connections: { ...DEFAULT_PROFILE_PRIVACY_TIER },
};

export const PROFILE_PRIVACY_META: Record<
  ProfilePrivacyKey,
  { label: string; description: string }
> = {
  showLocation: {
    label: 'Location',
    description: 'City and country on profile',
  },
  showSalahStats: {
    label: 'Salah statistics',
    description: 'Weekly rate, streak, and lifetime stats',
  },
  showGoldCoins: {
    label: 'Gold coins',
    description: 'Coin balance and rewards progress',
  },
  showBadge: {
    label: 'Badge tier',
    description: 'Earned badge name and icon',
  },
  showWaktStatus: {
    label: 'Live wakt status',
    description: 'Prayer activity on the Wakt board',
  },
  showMemberSince: {
    label: 'Member since',
    description: 'When you joined Addawah',
  },
  showAvatarPhoto: {
    label: 'Profile photo',
    description: 'Uploaded photo (silhouette when hidden)',
  },
};

function parseTier(raw: unknown, fallback: ProfilePrivacyTier): ProfilePrivacyTier {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...fallback };
  const obj = raw as Record<string, unknown>;
  const tier = { ...fallback };
  for (const key of PROFILE_PRIVACY_KEYS) {
    if (typeof obj[key] === 'boolean') tier[key] = obj[key];
  }
  return tier;
}

function isLegacyPrivacy(obj: Record<string, unknown>) {
  return PROFILE_PRIVACY_KEYS.some((key) => typeof obj[key] === 'boolean');
}

export function parseProfilePrivacy(raw: unknown): ProfilePrivacy {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      public: { ...DEFAULT_PROFILE_PRIVACY_TIER },
      connections: { ...DEFAULT_PROFILE_PRIVACY_TIER },
    };
  }

  const obj = raw as Record<string, unknown>;

  if (isLegacyPrivacy(obj)) {
    const legacy = parseTier(obj, DEFAULT_PROFILE_PRIVACY_TIER);
    return { public: { ...legacy }, connections: { ...legacy } };
  }

  return {
    public: parseTier(obj.public, DEFAULT_PROFILE_PRIVACY_TIER),
    connections: parseTier(obj.connections, DEFAULT_PROFILE_PRIVACY_TIER),
  };
}

export function privacyPatchSchema(raw: unknown): Partial<ProfilePrivacy> | null {
  if (raw === undefined) return null;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const obj = raw as Record<string, unknown>;
  const patch: Partial<ProfilePrivacy> = {};

  if (isLegacyPrivacy(obj)) {
    const tier = parseTier(obj, DEFAULT_PROFILE_PRIVACY_TIER);
    return { public: tier, connections: tier };
  }

  if (obj.public !== undefined) {
    patch.public = parseTier(obj.public, DEFAULT_PROFILE_PRIVACY_TIER);
  }
  if (obj.connections !== undefined) {
    patch.connections = parseTier(obj.connections, DEFAULT_PROFILE_PRIVACY_TIER);
  }

  return patch.public || patch.connections ? patch : null;
}

export function mergeProfilePrivacy(
  current: ProfilePrivacy,
  patch: Partial<ProfilePrivacy> | null,
): ProfilePrivacy {
  if (!patch) return current;
  return {
    public: patch.public ? { ...current.public, ...patch.public } : current.public,
    connections: patch.connections
      ? { ...current.connections, ...patch.connections }
      : current.connections,
  };
}

export function profileViewerFromConnection(status: ConnectionStatus): ProfileViewerContext {
  if (status === 'self') return 'self';
  if (status === 'connected') return 'connection';
  return 'public';
}

export function canView(
  privacy: ProfilePrivacy,
  key: ProfilePrivacyKey,
  viewer: ProfileViewerContext,
) {
  if (viewer === 'self') return true;
  if (viewer === 'connection') return privacy.connections[key];
  return privacy.public[key];
}
