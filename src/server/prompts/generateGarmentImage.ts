/**
 * Generate a clean garment image on a white background.
 */

import { generateImage, type ContentPart } from '@server/lib/gemini';
import { logger } from '@server/lib/logger';

const log = logger.child({ module: 'generateGarmentImage' });

export const GARMENT_IMAGE_MODEL = process.env.GARMENT_IMAGE_MODEL || 'gemini-2.5-flash-image';

function buildPrompt(category: string | null, label: string | null): string {
  const garmentDesc = label ?? category ?? 'garment';

  return `You are a professional product photographer.

You are given a cropped photo of a ${garmentDesc}${category ? ` (category: ${category})` : ''}.
The crop may include background fragments, other clothing, body parts, or other noise — IGNORE all of that.

Your task: generate a clean, studio-quality product photo of ONLY this garment.

Rules:
- Show the garment laid flat or on an invisible mannequin — natural shape, no person visible.
- Solid pure white background (#FFFFFF), no shadows, no floor, no props.
- It should have the same color, pattern, material, silhouette, details (buttons, zippers, logos, stitching).
- Do NOT change, stylize, or reinterpret the garment in any way.
- Single garment only. If the crop contains multiple items, reproduce only the main ${garmentDesc}.
- High resolution, centered, fill ~80% of the frame.
- Output ONE image, no collage.`;
}

export type GenerateGarmentImageInput = {
  /** Cropped garment image as base64 */
  image: { base64: string; mimeType: string };
  /** Garment category (e.g. "top", "pants", "shoes") */
  category: string | null;
  /** Garment label (e.g. "black hoodie", "blue jeans") */
  label: string | null;
};

export type GenerateGarmentImageResult = {
  base64: string;
  mimeType: string;
};

export async function generateGarmentImage(
  input: GenerateGarmentImageInput
): Promise<GenerateGarmentImageResult> {
  const { image, category, label } = input;

  const prompt = buildPrompt(category, label);

  const contentParts: ContentPart[] = [
    { text: prompt },
    { inlineData: { data: image.base64, mimeType: image.mimeType } },
    { text: 'Now generate the clean product photo of this garment on a white background.' },
  ];

  log.info(
    { category, label, mimeType: image.mimeType },
    'calling Gemini for garment image generation'
  );

  const generated = await generateImage({
    prompt: '',
    contentParts,
    responseModalities: ['text', 'image'],
    model: GARMENT_IMAGE_MODEL,
    timeoutMs: 60_000,
  });

  log.info({ mimeType: generated.mimeType }, 'garment image generated');

  return {
    base64: generated.base64,
    mimeType: generated.mimeType,
  };
}
