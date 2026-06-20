import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiRequireAuth, jsonError, jsonOk } from '@/lib/api-helpers';
import { normalizeMobile } from '@/lib/phone-countries';
import { isValidEmail, sanitizeEmail, sanitizeName } from '@/lib/validation';

const patchSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  email: z.string().email().optional(),
  mobile: z.string().min(8).optional(),
  city: z.string().max(80).optional(),
  country: z.string().min(2).max(80).optional(),
  avatarColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  themeColor: z.enum(['green', 'blue', 'gold', 'purple', 'silver', 'pink']).optional(),
  themeMode: z.enum(['dark', 'light']).optional(),
});

export async function GET() {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const profile = await prisma.user.findUnique({
    where: { id: user!.id },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      mobile: true,
      avatarColor: true,
      avatarUrl: true,
      city: true,
      country: true,
      themeColor: true,
      themeMode: true,
      createdAt: true,
    },
  });

  if (!profile) return jsonError('User not found', 404);
  return jsonOk({ profile });
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  try {
    const body = patchSchema.parse(await req.json());
    const data: Record<string, string | null> = {};

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

    if (body.city !== undefined) {
      data.city = body.city.trim() || null;
    }

    if (body.country !== undefined) {
      data.country = body.country.trim();
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

    const profile = await prisma.user.update({
      where: { id: user!.id },
      data,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        mobile: true,
        avatarColor: true,
        avatarUrl: true,
        city: true,
        country: true,
        themeColor: true,
        themeMode: true,
        createdAt: true,
      },
    });

    return jsonOk({ profile });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError(e.errors[0]?.message ?? 'Invalid input', 400);
    console.error(e);
    return jsonError('Failed to update profile', 500);
  }
}
