import sharp from 'sharp';
// @ts-expect-error heic-decode has no types
import decode from 'heic-decode';

/** Maximum dimension (width or height) for output images */
const MAX_DIMENSION = 1600;

/** JPEG quality (0-100) */
const JPEG_QUALITY = 82;

export interface ProcessedImage {
  jpegBuffer: Buffer;
  width: number;
  height: number;
  storedSizeBytes: number;
}

function isHeicUnsupportedError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  return (
    lower.includes('heif') ||
    lower.includes('heic') ||
    lower.includes('decoding plugin') ||
    lower.includes('compression format') ||
    lower.includes('bad seek')
  );
}

/** Run resize + JPEG encode with sharp (input is either raw file or already-decoded raw RGBA). */
async function sharpenToJpeg(
  input: Buffer | Uint8Array,
  options?: sharp.SharpOptions
): Promise<ProcessedImage> {
  const image = sharp(input, options ?? { failOn: 'error' });

  const metadata = await image.metadata();
  const width = metadata.width!;
  const height = metadata.height!;

  const jpegBuffer = await image
    .resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .rotate()
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();

  const outMeta = await sharp(jpegBuffer).metadata();
  return {
    jpegBuffer,
    width: outMeta.width ?? width,
    height: outMeta.height ?? height,
    storedSizeBytes: jpegBuffer.length,
  };
}

export async function processImage(buffer: Buffer | Uint8Array): Promise<ProcessedImage> {
  const inputBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

  try {
    return await sharpenToJpeg(inputBuffer);
  } catch (err) {
    if (!isHeicUnsupportedError(err)) throw err;

    // Sharp has no HEIC support; decode with heic-decode (libheif-js) then pass raw RGBA to sharp
    const { width, height, data } = await decode({ buffer: inputBuffer });
    const rawBuffer = Buffer.from(data);

    return await sharpenToJpeg(rawBuffer, {
      raw: { width, height, channels: 4 as const },
    });
  }
}
