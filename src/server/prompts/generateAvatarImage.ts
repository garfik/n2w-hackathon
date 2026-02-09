/**
 * Generate avatar image: body + face photos + default outfit → one composite photo.
 * Sends raw images to Gemini with interleaved labels.
 */

import { join } from 'path';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import { generateImage, type ContentPart } from '@server/lib/gemini';
import { getObjectBuffer, putObject } from '@server/lib/storage';
import { db } from '../../db/client';
import { upload } from '../../db/domain.schema';
import { sha256 } from '@server/lib/hash';
import { logger } from '@server/lib/logger';

const log = logger.child({ module: 'generateAvatarImage' });

export const AVATAR_IMAGE_MODEL = process.env.AVATAR_IMAGE_MODEL || 'gemini-3-pro-image-preview';

// ── Interleaved prompt segments ──

function introAndBody(heightCm: number): string {
  return `Edit the following person photo to change their clothes and refine their face.
The person is ${heightCm} cm tall.
Here is the person's FULL BODY photo — use this for body shape, proportions, build, and skin tone. The person's height is ${heightCm} cm — use this to make proportions realistic. Ignore their current clothing:`;
}

const FACE_INTRO = `Here is a CLOSE-UP FACE photo of the same person — use this to refine the face in the output. Copy exact facial features, hair style, hair color, makeup this close-up. Enhance the face with complimentary fashionable makeup if it's women and neat, polished hairstyling that suits the person's hair type and length, neutral smile:`;

const OUTFIT_INTRO = `Here is the TARGET OUTFIT — redress the person in exactly these clothes. Copy the garment colors, patterns, and silhouettes. Fit them naturally to the person's body from the first photo:`;

const FINAL_INSTRUCTION = `Now generate the final image:
- Take the person from the first photo (body shape, proportions, skin tone) in relaxed modeling pose front-facing, head to feet visible full-height
- The person's proportions should look natural for the given height
- Apply the face details from the second photo (facial features, hair, makeup)
- Dress them in the outfit from the third photo
- Clean solid white or light gray background
- ONE person, ONE image, no text, no watermark
- IMPORTANT: the body build must come from the FIRST photo, NOT from the outfit photo`;

export type GenerateAvatarImageInput = {
  bodyPhotoUploadId: string;
  facePhotoUploadId: string;
  heightCm: number;
  /** Optional user prompt to guide generation (e.g. pose, style). */
  prompt?: string;
};

export type GenerateAvatarImageResult = {
  uploadId: string;
};

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

function getDefaultOutfitPath(): string {
  return join(import.meta.dir, '../../client/assets/default_outfit.jpg');
}

export async function generateAvatarImage(
  input: GenerateAvatarImageInput
): Promise<GenerateAvatarImageResult> {
  const { bodyPhotoUploadId, facePhotoUploadId, heightCm, prompt: userPrompt } = input;

  log.info({ bodyPhotoUploadId, facePhotoUploadId, heightCm }, 'loading avatar photos');

  const [bodyData, faceData] = await Promise.all([
    loadBufferFromUpload(bodyPhotoUploadId),
    loadBufferFromUpload(facePhotoUploadId),
  ]);

  const outfitPath = getDefaultOutfitPath();
  const outfitFile = Bun.file(outfitPath);
  if (!(await outfitFile.exists())) {
    throw new Error(`Default outfit not found: ${outfitPath}`);
  }
  const outfitBuffer = Buffer.from(await outfitFile.arrayBuffer());

  const finalText = userPrompt?.trim()
    ? `${FINAL_INSTRUCTION}\n\nAdditional instructions from the user: ${userPrompt.trim()}`
    : FINAL_INSTRUCTION;

  const contentParts: ContentPart[] = [
    { text: introAndBody(heightCm) },
    { inlineData: { data: bodyData.buffer.toString('base64'), mimeType: bodyData.mime } },
    { text: FACE_INTRO },
    { inlineData: { data: faceData.buffer.toString('base64'), mimeType: faceData.mime } },
    { text: OUTFIT_INTRO },
    { inlineData: { data: outfitBuffer.toString('base64'), mimeType: 'image/jpeg' } },
    { text: finalText },
  ];

  log.info({ partCount: contentParts.length }, 'calling Gemini for avatar image generation');

  const generated = await generateImage({
    prompt: '',
    contentParts,
    responseModalities: ['text', 'image'],
    model: AVATAR_IMAGE_MODEL,
    timeoutMs: 90_000,
  });

  log.info({ mimeType: generated.mimeType }, 'avatar image generated, saving to storage');

  const imageBuffer = Buffer.from(generated.base64, 'base64');
  const metadata = await sharp(imageBuffer).metadata();
  const jpegBuffer = await sharp(imageBuffer).jpeg({ quality: 90 }).toBuffer();
  const jpegMeta = await sharp(jpegBuffer).metadata();
  const width = jpegMeta.width ?? metadata.width ?? 0;
  const height = jpegMeta.height ?? metadata.height ?? 0;

  const imageSha256 = sha256(jpegBuffer);
  const uploadId = crypto.randomUUID();
  const storedKey = `avatars-generated/${uploadId}.jpg`;

  await putObject(storedKey, jpegBuffer, 'image/jpeg');

  await db.insert(upload).values({
    id: uploadId,
    originalSha256: imageSha256,
    originalMime: generated.mimeType,
    originalSizeBytes: imageBuffer.length,
    storedKey,
    storedMime: 'image/jpeg',
    storedSizeBytes: jpegBuffer.length,
    width,
    height,
  });

  log.info({ uploadId, width, height }, 'avatar image saved');

  return { uploadId };
}
