import { mkdir, writeFile, unlink, readdir } from 'fs/promises';
import path from 'path';

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

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
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error('Use a JPG, PNG, or WebP image');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Image must be 2MB or smaller');
  }

  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_UPLOAD_PRESET) {
    return uploadCloudinary(file, userId);
  }

  return saveLocalAvatar(userId, file);
}

export async function deleteStoredAvatar(userId: string, avatarUrl: string | null) {
  if (!avatarUrl) return;

  if (avatarUrl.includes('cloudinary.com')) return;

  const base = avatarUrl.split('?')[0];
  const relative = base.replace(/^\//, '');
  const filePath = path.join(process.cwd(), 'public', relative);
  await unlink(filePath).catch(() => {});
}
