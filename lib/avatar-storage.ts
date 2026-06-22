import { del, put } from '@vercel/blob';
import { mkdir, writeFile, unlink, readdir } from 'fs/promises';
import path from 'path';
import { validateAvatarFile } from './avatar-limits';
import { isBlobAvatar, isLocalAvatar, blobUrlWithoutQuery } from './avatar-url';

function extForMime(type: string) {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  return 'jpg';
}

function blobTokenOptions() {
  return process.env.BLOB_READ_WRITE_TOKEN
    ? { token: process.env.BLOB_READ_WRITE_TOKEN }
    : {};
}

function resolveBlobAccess(): 'public' | 'private' {
  const mode = process.env.BLOB_ACCESS?.toLowerCase();
  if (mode === 'public' || mode === 'private') return mode;
  return 'private';
}

function resolveStorageBackend(): 'cloudinary' | 'blob' | 'local' {
  const explicit = process.env.AVATAR_STORAGE?.toLowerCase();
  if (explicit === 'cloudinary' || explicit === 'blob' || explicit === 'local') {
    return explicit;
  }

  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_UPLOAD_PRESET) {
    return 'cloudinary';
  }

  if (process.env.NODE_ENV === 'development') {
    return 'local';
  }

  if (canUseVercelBlob()) {
    return 'blob';
  }

  return 'local';
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
  return `${data.secure_url}?v=${Date.now()}`;
}

function canUseVercelBlob() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return true;
  if (process.env.VERCEL && process.env.BLOB_STORE_ID) return true;
  return false;
}

async function uploadVercelBlob(userId: string, file: File): Promise<string> {
  const ext = extForMime(file.type);
  const access = resolveBlobAccess();
  const blob = await put(`avatars/${userId}.${ext}`, file, {
    access,
    addRandomSuffix: false,
    allowOverwrite: true,
    ...blobTokenOptions(),
  });

  return `${blob.url}?v=${Date.now()}`;
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

  const backend = resolveStorageBackend();

  if (backend === 'cloudinary') {
    return uploadCloudinary(file, userId);
  }

  if (backend === 'blob') {
    if (!canUseVercelBlob()) {
      throw new Error(
        'Vercel Blob is not configured. Set BLOB_READ_WRITE_TOKEN or connect a Blob store.',
      );
    }
    return uploadVercelBlob(userId, file);
  }

  if (process.env.VERCEL && !canUseVercelBlob()) {
    throw new Error(
      'Profile photos need a connected Vercel Blob store or Cloudinary. In Vercel → Storage, connect your Blob store.',
    );
  }

  return saveLocalAvatar(userId, file);
}

export async function deleteStoredAvatar(_userId: string, avatarUrl: string | null) {
  if (!avatarUrl) return;

  if (avatarUrl.includes('cloudinary.com')) return;

  if (isBlobAvatar(avatarUrl)) {
    await del(blobUrlWithoutQuery(avatarUrl), blobTokenOptions()).catch(() => {});
    return;
  }

  if (!isLocalAvatar(avatarUrl)) return;

  const base = avatarUrl.split('?')[0];
  const relative = base.replace(/^\//, '');
  const filePath = path.join(process.cwd(), 'public', relative);
  await unlink(filePath).catch(() => {});
}
