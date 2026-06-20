import { del, put } from '@vercel/blob';
import { mkdir, writeFile, unlink, readdir } from 'fs/promises';
import path from 'path';
import { validateAvatarFile } from './avatar-limits';

function extForMime(type: string) {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  return 'jpg';
}

async function uploadCloudinary(file: File, userId: string): Promise<string> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary is not configured');
  }

  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', uploadPreset);
  form.append('folder', 'addawah/avatars');
  form.append('public_id', userId);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    throw new Error('Cloudinary upload failed');
  }

  const data = (await res.json()) as { secure_url?: string };
  if (!data.secure_url) throw new Error('Cloudinary upload failed');
  return data.secure_url;
}

function canUseVercelBlob() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return true;
  // Connected Blob store on Vercel (OIDC auth at runtime)
  if (process.env.VERCEL && process.env.BLOB_STORE_ID) return true;
  return false;
}

async function uploadVercelBlob(userId: string, file: File): Promise<string> {
  const ext = extForMime(file.type);
  const blob = await put(`avatars/${userId}.${ext}`, file, {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    ...(process.env.BLOB_READ_WRITE_TOKEN
      ? { token: process.env.BLOB_READ_WRITE_TOKEN }
      : {}),
  });

  return blob.url;
}

async function saveLocalAvatar(userId: string, file: File): Promise<string> {
  const ext = extForMime(file.type);
  const dir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
  await mkdir(dir, { recursive: true });

  const existing = await readdir(dir).catch(() => [] as string[]);
  await Promise.all(
    existing
      .filter((name) => name.startsWith(`${userId}.`))
      .map((name) => unlink(path.join(dir, name)).catch(() => {})),
  );

  const filename = `${userId}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);
  return `/uploads/avatars/${filename}?v=${Date.now()}`;
}

export async function saveAvatar(userId: string, file: File): Promise<string> {
  const validationError = validateAvatarFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_UPLOAD_PRESET) {
    return uploadCloudinary(file, userId);
  }

  if (canUseVercelBlob()) {
    return uploadVercelBlob(userId, file);
  }

  if (process.env.VERCEL) {
    throw new Error(
      'Profile photos need a connected Vercel Blob store or Cloudinary. In Vercel → Storage, open your existing Blob store (do not create a second connection).',
    );
  }

  return saveLocalAvatar(userId, file);
}

export async function deleteStoredAvatar(_userId: string, avatarUrl: string | null) {
  if (!avatarUrl) return;

  if (avatarUrl.includes('cloudinary.com')) return;

  if (avatarUrl.includes('blob.vercel-storage.com')) {
    await del(
      avatarUrl,
      process.env.BLOB_READ_WRITE_TOKEN
        ? { token: process.env.BLOB_READ_WRITE_TOKEN }
        : undefined,
    ).catch(() => {});
    return;
  }

  const base = avatarUrl.split('?')[0];
  const relative = base.replace(/^\//, '');
  const filePath = path.join(process.cwd(), 'public', relative);
  await unlink(filePath).catch(() => {});
}
