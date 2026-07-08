import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiRequireAuth, jsonError, jsonOk } from '@/lib/api-helpers';
import { normalizeMobile } from '@/lib/phone-countries';
import {
  DEFAULT_PROFILE_PRIVACY,
  mergeProfilePrivacy,
  parseProfilePrivacy,
  privacyPatchSchema,
  PROFILE_PRIVACY_KEYS,
} from '@/lib/profile-privacy';
import { isValidEmail, sanitizeEmail, sanitizeName } from '@/lib/validation';

const privacyTierSchema = z.object(
  Object.fromEntries(PROFILE_PRIVACY_KEYS.map((k) => [k, z.boolean().optional()])) as Record<
    (typeof PROFILE_PRIVACY_KEYS)[number],
    z.ZodOptional<z.ZodBoolean>
  >,
);

const privacySchema = privacyTierSchema
  .extend({
    public: privacyTierSchema.optional(),
    connections: privacyTierSchema.optional(),
  })
  .passthrough();

const patchSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  email: z.string().email().optional(),
  mobile: z.string().min(8).optional(),
  gender: z.enum(['MALE', 'FEMALE']).optional(),
  city: z.string().max(80).optional(),
  country: z.string().min(2).max(80).optional(),
  avatarColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  themeColor: z.enum(['green', 'blue', 'gold', 'purple', 'silver', 'pink']).optional(),
  themeMode: z.enum(['dark', 'light']).optional(),
  profilePrivacy: privacySchema.optional(),
  location: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      timeZone: z.string().min(2).max(64),
      city: z.string().min(1).max(80),
      country: z.string().min(1).max(80),
      countryCode: z.string().min(2).max(2).optional(),
    })
    .nullable()
    .optional(),
});
const profileSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  mobile: true,
  gender: true,
  avatarColor: true,
  avatarUrl: true,
  city: true,
  country: true,
  latitude: true,
  longitude: true,
  timeZone: true,
  themeColor: true,
  themeMode: true,
  profilePrivacy: true,
  createdAt: true,
} as const;

function formatProfile(profile: {
  profilePrivacy: unknown;
  createdAt: Date;
  [key: string]: unknown;
}) {
  return {
    ...profile,
    profilePrivacy: parseProfilePrivacy(profile.profilePrivacy),
  };
}

export async function GET() {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const profile = await prisma.user.findUnique({
    where: { id: user!.id },
    select: profileSelect,
  });

  if (!profile) return jsonError('User not found', 404);
  return jsonOk({ profile: formatProfile(profile) });
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await apiRequireAuth();
  if (error) return error;
  try {
    const body = patchSchema.parse(await req.json());
    const data: Record<string, string | number | null | object> = {};

    if (body.name !== undefined) {
      data.name = sanitizeName(body.name);
    }

    if (body.email !== undefined) {
      const email = sanitizeEmail(body.email);
      if (!isValidEmail(email)) return jsonError('Enter a valid email address', 400);
      const taken = await prisma.user.findFirst({
        where: { email, NOT: { id: user!.id } },
        select: { id: true },
      });
      if (taken) return jsonError('This email is already in use', 409);
      data.email = email;
    }

    if (body.mobile !== undefined) {
      const mobile = normalizeMobile(body.mobile);
      if (!mobile) return jsonError('Enter a valid phone number', 400);
      const taken = await prisma.user.findFirst({
        where: { mobile, NOT: { id: user!.id } },
        select: { id: true },
      });
      if (taken) return jsonError('This phone number is already in use', 409);
      data.mobile = mobile;
    }

    if (body.gender !== undefined) {
      data.gender = body.gender;
    }

    if (body.city !== undefined) {
      data.city = body.city.trim() || null;
    }

    if (body.country !== undefined) {
      data.country = body.country.trim();
    }

    if (body.location !== undefined) {
      // Picker resolved a precise location — overwrite coords/timezone + sync
      // display labels. A `null` body clears all five fields (used if we ever
      // ship a "clear location" affordance).
      if (body.location === null) {
        data.latitude = null;
        data.longitude = null;
        data.timeZone = null;
        data.city = null;
        data.country = null;
      } else {
        data.latitude = body.location.latitude;
        data.longitude = body.location.longitude;
        data.timeZone = body.location.timeZone;
        data.city = body.location.city;
        data.country = body.location.country;
      }
    }

    if (body.avatarColor !== undefined) {
      data.avatarColor = body.avatarColor;
    }

    if (body.themeColor !== undefined) {
      data.themeColor = body.themeColor;
    }

    if (body.themeMode !== undefined) {
      data.themeMode = body.themeMode;
    }

    if (body.profilePrivacy !== undefined) {
      const current = await prisma.user.findUnique({
        where: { id: user!.id },
        select: { profilePrivacy: true },
      });
      const merged = mergeProfilePrivacy(
        parseProfilePrivacy(current?.profilePrivacy ?? DEFAULT_PROFILE_PRIVACY),
        privacyPatchSchema(body.profilePrivacy),
      );
      data.profilePrivacy = merged;
    }

    const profile = await prisma.user.update({
      where: { id: user!.id },
      data,
      select: profileSelect,
    });

    return jsonOk({ profile: formatProfile(profile) });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError(e.errors[0]?.message ?? 'Invalid input', 400);
    logger.error({ route: '/api/profile', err: e }, 'Failed to update profile');
    return jsonError('Failed to update profile', 500);
  }
}
