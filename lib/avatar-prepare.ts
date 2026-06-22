import { ALLOWED_AVATAR_TYPES, MAX_AVATAR_BYTES } from './avatar-limits';

function mimeFromName(name: string): string | null {
  const lower = name.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return null;
}

function resolveMime(file: File): string | null {
  if (ALLOWED_AVATAR_TYPES.includes(file.type as (typeof ALLOWED_AVATAR_TYPES)[number])) {
    return file.type;
  }
  return mimeFromName(file.name);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read this image'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('Could not prepare image'));
        else resolve(blob);
      },
      type,
      quality,
    );
  });
}

/** Resize and compress so uploads pass server limits without user-facing size errors. */
export async function prepareAvatarFile(file: File): Promise<File> {
  const mime = resolveMime(file);
  if (!mime) {
    throw new Error('Use a JPG, PNG, or WebP image');
  }

  if (file.size <= MAX_AVATAR_BYTES) {
    if (file.type === mime) return file;
    return new File([file], file.name || 'avatar.jpg', { type: mime });
  }

  const img = await loadImage(file);
  const maxSide = 512;
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not prepare image');
  ctx.drawImage(img, 0, 0, width, height);

  const outputType = mime === 'image/png' ? 'image/jpeg' : mime;
  const ext = outputType === 'image/webp' ? 'webp' : 'jpg';

  let quality = 0.88;
  let blob = await canvasToBlob(canvas, outputType, quality);

  while (blob.size > MAX_AVATAR_BYTES && quality > 0.45) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, outputType, quality);
  }

  if (blob.size > MAX_AVATAR_BYTES) {
    throw new Error('Image is too large — try a smaller photo');
  }

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'avatar';
  return new File([blob], `${baseName}.${ext}`, { type: outputType });
}
