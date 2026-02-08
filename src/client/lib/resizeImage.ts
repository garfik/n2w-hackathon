/**
 * Resize an image file on the client to reduce resolution before upload.
 * Preserves aspect ratio; scales down so the longer side is at most maxDimensionPx.
 * Output is JPEG for smaller size (quality 0.88) unless the source is PNG and we keep PNG.
 */

const DEFAULT_MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.88;

export interface ResizeImageOptions {
  /** Max width or height in pixels (default 1920). */
  maxDimensionPx?: number;
  /** JPEG quality 0–1 when output is JPEG (default 0.88). */
  quality?: number;
}

/**
 * Resize image file so the longer side is at most maxDimensionPx.
 * Returns a new File (JPEG or PNG) with reduced dimensions.
 */
export async function resizeImageFile(
  file: File,
  options: ResizeImageOptions = {}
): Promise<File> {
  const { maxDimensionPx = DEFAULT_MAX_DIMENSION, quality = JPEG_QUALITY } = options;

  const img = await loadImage(file);
  const { width, height } = img;

  if (width <= maxDimensionPx && height <= maxDimensionPx) {
    return file;
  }

  const scale = Math.min(maxDimensionPx / width, maxDimensionPx / height, 1);
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2d not available');
  ctx.drawImage(img, 0, 0, w, h);

  const isPng = file.type === 'image/png';
  const mimeType = isPng ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    canvas.toBlob(
      (b) => resolve(b),
      mimeType,
      isPng ? undefined : quality
    );
  });
  if (!blob) throw new Error('Failed to create resized blob');

  const baseName = file.name.replace(/\.[^.]+$/i, '');
  const ext = isPng ? '.png' : '.jpg';
  return new File([blob], `${baseName}_resized${ext}`, { type: mimeType });
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
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}
