/**
 * Preprocess avatar photos: remove background (rembg) and crop to content.
 * On any failure, falls back to the original image.
 */

import sharp from 'sharp';
import { join } from 'path';
import { logger } from '@server/lib/logger';

const log = logger.child({ module: 'preprocessAvatarPhoto' });

const MAX_DIMENSION = 1600;
const ALPHA_THRESHOLD = 128;
const CROP_PADDING = 0.1;

/** Path to the rembg Python script (from project root). */
function getRembgScriptPath(): string {
  return join(import.meta.dir, '../../../..', 'scripts', 'rembg_remove.py');
}

/**
 * Run rembg via Python subprocess. Returns PNG buffer or null on failure.
 */
async function removeBackgroundWithRembg(inputBuffer: Buffer): Promise<Buffer | null> {
  const scriptPath = getRembgScriptPath();
  const tmpDir = join(process.cwd(), 'tmp');
  try {
    const { mkdir, writeFile, readFile, unlink } = await import('fs/promises');
    await mkdir(tmpDir, { recursive: true });
    const id = crypto.randomUUID().slice(0, 8);
    const inputPath = join(tmpDir, `rembg_in_${id}.jpg`);
    const outputPath = join(tmpDir, `rembg_out_${id}.png`);
    await writeFile(inputPath, inputBuffer);
    const proc = Bun.spawn(['python3', scriptPath, inputPath, outputPath], {
      stdout: 'ignore',
      stderr: 'pipe',
    });
    const exitCode = await proc.exited;
    const stderr = await new Response(proc.stderr).text();
    try {
      await unlink(inputPath);
    } catch {
      // ignore
    }
    if (exitCode !== 0) {
      log.warn({ exitCode, stderr: stderr.slice(0, 300) }, 'rembg subprocess failed');
      return null;
    }
    const outBuffer = await readFile(outputPath);
    try {
      await unlink(outputPath);
    } catch {
      // ignore
    }
    return outBuffer;
  } catch (err) {
    log.warn({ err }, 'rembg failed, falling back to original');
    return null;
  }
}

/**
 * Compute bounding box of pixels with alpha > threshold. Returns null if no content.
 */
function contentBboxFromPng(
  pngBuffer: Buffer
): Promise<{ left: number; top: number; width: number; height: number } | null> {
  return sharp(pngBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
    .then(({ data, info }) => {
      const { width, height, channels } = info;
      let minX = width;
      let minY = height;
      let maxX = 0;
      let maxY = 0;
      const alphaIdx = channels - 1;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * channels;
          if (data[idx + alphaIdx]! > ALPHA_THRESHOLD) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (minX > maxX || minY > maxY) return null;
      const w = maxX - minX + 1;
      const h = maxY - minY + 1;
      const padX = Math.max(1, Math.round(w * CROP_PADDING));
      const padY = Math.max(1, Math.round(h * CROP_PADDING));
      return {
        left: Math.max(0, minX - padX),
        top: Math.max(0, minY - padY),
        width: Math.min(width - Math.max(0, minX - padX), w + 2 * padX),
        height: Math.min(height - Math.max(0, minY - padY), h + 2 * padY),
      };
    });
}

export interface PreprocessResult {
  buffer: Buffer;
  mimeType: string;
}

/**
 * Preprocess an avatar photo: optional resize, background removal, crop to content.
 * On rembg or crop failure, returns the original image (optionally resized).
 */
export async function preprocessAvatarPhoto(
  buffer: Buffer,
  mimeType: string
): Promise<PreprocessResult> {
  let input = buffer;
  let mime = mimeType;

  try {
    const meta = await sharp(buffer).metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
      input = await sharp(buffer)
        .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toBuffer();
      mime = 'image/jpeg';
    }
  } catch (err) {
    log.warn({ err }, 'resize failed, using original size');
  }

  const noBg = await removeBackgroundWithRembg(input);
  if (!noBg) {
    return { buffer: input, mimeType: mime };
  }

  try {
    const bbox = await contentBboxFromPng(noBg);
    if (!bbox) {
      return { buffer: noBg, mimeType: 'image/png' };
    }
    const cropped = await sharp(noBg).extract(bbox).png().toBuffer();
    return { buffer: cropped, mimeType: 'image/png' };
  } catch (err) {
    log.warn({ err }, 'crop failed, using no-background image');
    return { buffer: noBg, mimeType: 'image/png' };
  }
}
