import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiRequireAuth, jsonError, jsonOk } from '@/lib/api-helpers';
import { deleteStoredAvatar, saveAvatar } from '@/lib/avatar-storage';
import { parseProfilePrivacy } from '@/lib/profile-privacy';

const profileSelect = {
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
  profilePrivacy: true,
  createdAt: true,
} as const;

function formatProfile(profile: { profilePrivacy: unknown; [key: string]: unknown }) {
  return { ...profile, profilePrivacy: parseProfilePrivacy(profile.profilePrivacy) };
}

export async function POST(req: NextRequest) {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  try {
    const form = await req.formData();
    const file = form.get('avatar');

    if (!(file instanceof File)) {
      return jsonError('Choose an image to upload', 400);
    }

    const current = await prisma.user.findUnique({
      where: { id: user!.id },
      select: { avatarUrl: true },
    });

    // Remove the previous file first — save + delete in reverse deletes the new upload
    // when local path or blob pathname is unchanged (replace photo).
    await deleteStoredAvatar(user!.id, current?.avatarUrl ?? null);
    const avatarUrl = await saveAvatar(user!.id, file);

    const profile = await prisma.user.update({
      where: { id: user!.id },
      data: { avatarUrl },
      select: profileSelect,
    });

    return jsonOk({ profile: formatProfile(profile) });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Upload failed';
    console.error('[avatar upload]', e);
    return jsonError(message, 400);
  }
}

export async function DELETE() {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const current = await prisma.user.findUnique({
    where: { id: user!.id },
    select: { avatarUrl: true },
  });

  await deleteStoredAvatar(user!.id, current?.avatarUrl ?? null);

  const profile = await prisma.user.update({
    where: { id: user!.id },
    data: { avatarUrl: null },
    select: profileSelect,
  });

  return jsonOk({ profile: formatProfile(profile) });
}
