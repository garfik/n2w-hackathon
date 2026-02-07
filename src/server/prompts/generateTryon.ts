/**
 * Virtual try-on image generation.
 * Takes an avatar (person) image + garment images → generates a composite try-on photo.
 */

import { generateImage, type ImageInput } from '@server/lib/gemini';
import { getObjectBuffer } from '@server/lib/storage';
import { db } from '../../db/client';
import { upload } from '../../db/domain.schema';
import { eq } from 'drizzle-orm';
import { sha256 } from '@server/lib/hash';
import { putObject } from '@server/lib/storage';
import { logger } from '@server/lib/logger';
import sharp from 'sharp';

const log = logger.child({ module: 'generateTryon' });

const DEBUG_TRYON = process.env.DEBUG_TRYON === 'true';

export const TRYON_IMAGE_MODEL = 'gemini-2.5-flash-image';

const TRYON_PROMPT = `You are a virtual try-on system that helps people try on clothes.

INPUT IMAGES
Image 0: the PERSON (base image). This defines the final framing and background.
Images 1..N: GARMENT CROPS (isolated clothing items). These are NOT people.

TASK
Generate ONE realistic photo of the SAME person from Image 0 wearing the garments from Images 1..N.

HARD CONSTRAINTS (must follow)
- Output must contain EXACTLY ONE person: the person from Image 0 who is willing to try on the garments from Images 1..N.
- Do NOT create a collage, grid, split-screen, side-by-side, or multiple panels.
- Do NOT return multiple variations in one image.
- Do NOT include the reference crops in the output.
- Keep the same camera framing, background, and aspect ratio as Image 0.

IDENTITY LOCK
- Preserve face, body shape, proportions, pose and skin tone.
- Do NOT beautify, slim, enlarge or modify the body.
- Do NOT change hairstyle.

GARMENT TRANSFER
- Use ONLY the garments from Images 1..N.
- Preserve each garment’s color, pattern, silhouette, and length.
- Fit garments naturally with realistic folds and shadows.
- Apply correct layering: shirts under jackets; pants under tops; shoes on feet.

FAIL-SAFE
- If a garment crop is unclear or incomplete, skip it rather than hallucinating.
- If shoes are not clearly visible on the person in Image 0, skip shoes.

OUTPUT
Return ONE single photo-like image only. No text. No watermark.`;

export type GarmentInput = {
  /** Upload ID of the garment image */
  uploadId: string;
  /** Normalized bounding box (0..1) — null means use full image */
  bboxNorm: { x: number; y: number; w: number; h: number } | null;
  /** Garment name (e.g. "Black Hoodie") */
  name: string | null;
  /** Garment category (e.g. "top", "pants", "shoes") */
  category: string | null;
};

export type TryonInput = {
  /** Upload ID of the avatar photo */
  avatarUploadId: string;
  /** Garments with bbox and metadata */
  garments: GarmentInput[];
  /** User ID (for creating the result upload record) */
  userId: string;
};

export type TryonResult = {
  /** Upload ID of the generated try-on image */
  uploadId: string;
};

/** Padding factor around the bbox (15% on each side) */
const BBOX_PADDING = 0.15;

/**
 * Fetch an image from S3 via its upload record and return the raw buffer.
 */
async function loadBufferFromUpload(uploadId: string): Promise<{ buffer: Buffer; mime: string }> {
  const [row] = await db
    .select({ storedKey: upload.storedKey, storedMime: upload.storedMime })
    .from(upload)
    .where(eq(upload.id, uploadId));

  if (!row) {
    throw new Error(`Upload record not found: ${uploadId}`);
  }

  const buffer = await getObjectBuffer(row.storedKey);
  return { buffer, mime: row.storedMime };
}

/**
 * Crop an image buffer to the normalized bbox with padding, return as base64 JPEG.
 */
async function cropToBbox(
  buffer: Buffer,
  bbox: { x: number; y: number; w: number; h: number }
): Promise<Buffer> {
  const meta = await sharp(buffer).metadata();
  const imgW = meta.width ?? 0;
  const imgH = meta.height ?? 0;
  if (imgW === 0 || imgH === 0) throw new Error('Cannot read image dimensions for crop');

  // Apply padding
  const padX = bbox.w * BBOX_PADDING;
  const padY = bbox.h * BBOX_PADDING;

  const x1 = Math.max(0, bbox.x - padX);
  const y1 = Math.max(0, bbox.y - padY);
  const x2 = Math.min(1, bbox.x + bbox.w + padX);
  const y2 = Math.min(1, bbox.y + bbox.h + padY);

  const left = Math.round(x1 * imgW);
  const top = Math.round(y1 * imgH);
  const width = Math.max(1, Math.round((x2 - x1) * imgW));
  const height = Math.max(1, Math.round((y2 - y1) * imgH));

  return sharp(buffer).extract({ left, top, width, height }).jpeg({ quality: 90 }).toBuffer();
}

/**
 * Build a dynamic prompt section listing what each garment image is.
 */
function buildGarmentLegend(garments: GarmentInput[]): string {
  const lines = garments.map((g, i) => {
    const label = g.name ?? g.category ?? 'garment';
    const cat = g.category ? ` (${g.category})` : '';
    return `Image ${i + 1}: ${label}${cat}`;
  });
  return lines.join('\n');
}

/**
 * Generate a virtual try-on image using AI.
 *
 * 1. Loads the avatar and garment images from S3 (crops garments to bbox)
 * 2. Sends them to Gemini image generation with a descriptive prompt
 * 3. Saves the result to S3 and creates an upload record
 * 4. Returns the upload ID
 */
export async function generateTryon(input: TryonInput): Promise<TryonResult> {
  const { avatarUploadId, garments, userId } = input;

  log.info(
    { avatarUploadId, garmentCount: garments.length },
    'loading images for tryon generation'
  );

  // 1. Load avatar image (full image, no crop)
  const avatarData = await loadBufferFromUpload(avatarUploadId);
  const avatarImage: ImageInput = {
    base64: avatarData.buffer.toString('base64'),
    mimeType: avatarData.mime,
  };

  // 2. Load garment images, cropping to bbox when available
  const garmentImages = await Promise.all(
    garments.map(async (g): Promise<ImageInput> => {
      const { buffer, mime } = await loadBufferFromUpload(g.uploadId);

      if (g.bboxNorm) {
        const cropped = await cropToBbox(buffer, g.bboxNorm);
        return { base64: cropped.toString('base64'), mimeType: 'image/jpeg' };
      }

      return { base64: buffer.toString('base64'), mimeType: mime };
    })
  );

  const images: ImageInput[] = [avatarImage, ...garmentImages];

  // 3. Build prompt with garment legend
  const legend = buildGarmentLegend(garments);
  const prompt = `${TRYON_PROMPT}\n\nGARMENT LIST\nImage 0: the PERSON\n${legend}`;

  // Debug: dump prompt + input images to S3 for inspection
  if (DEBUG_TRYON) {
    const debugId = crypto.randomUUID().slice(0, 8);
    const debugPrefix = `debug/tryons/${debugId}`;
    log.info({ debugPrefix }, 'DEBUG_TRYON: saving input artifacts to S3');

    await putObject(`${debugPrefix}/prompt.txt`, Buffer.from(prompt, 'utf-8'), 'text/plain');
    await putObject(
      `${debugPrefix}/00_avatar.jpg`,
      Buffer.from(avatarImage.base64, 'base64'),
      avatarImage.mimeType
    );
    for (let i = 0; i < garmentImages.length; i++) {
      const gi = garmentImages[i]!;
      const g = garments[i]!;
      const label = (g.name ?? g.category ?? 'garment').replace(/[^a-zA-Z0-9_-]/g, '_');
      await putObject(
        `${debugPrefix}/${String(i + 1).padStart(2, '0')}_${label}.jpg`,
        Buffer.from(gi.base64, 'base64'),
        gi.mimeType
      );
    }
    log.info({ debugPrefix, fileCount: images.length + 1 }, 'DEBUG_TRYON: artifacts saved');
  }

  log.info({ imageCount: images.length }, 'calling Gemini image generation for tryon');

  // 4. Call Gemini image generation
  const generated = await generateImage({
    prompt,
    images,
    model: TRYON_IMAGE_MODEL,
    timeoutMs: 60_000, // image generation can be slow
  });

  log.info({ mimeType: generated.mimeType }, 'tryon image generated, saving to storage');

  // 3. Decode generated image and save to S3
  const imageBuffer = Buffer.from(generated.base64, 'base64');

  // Process through sharp to get dimensions and normalize to JPEG
  const metadata = await sharp(imageBuffer).metadata();
  const jpegBuffer = await sharp(imageBuffer).jpeg({ quality: 90 }).toBuffer();

  const jpegMeta = await sharp(jpegBuffer).metadata();
  const width = jpegMeta.width ?? metadata.width ?? 0;
  const height = jpegMeta.height ?? metadata.height ?? 0;

  const imageSha256 = sha256(jpegBuffer);
  const uploadId = crypto.randomUUID();
  const storedKey = `tryons/${uploadId}.jpg`;

  await putObject(storedKey, jpegBuffer, 'image/jpeg');

  // 4. Create upload record
  await db.insert(upload).values({
    id: uploadId,
    userId,
    originalSha256: imageSha256,
    originalMime: generated.mimeType,
    originalSizeBytes: imageBuffer.length,
    storedKey,
    storedMime: 'image/jpeg',
    storedSizeBytes: jpegBuffer.length,
    width,
    height,
  });

  log.info({ uploadId, width, height, storedSizeBytes: jpegBuffer.length }, 'tryon image saved');

  return { uploadId };
}
