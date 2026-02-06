/**
 * Garment detection from a single image: ONE AI call returns array of detections.
 * Uses Gemini vision + structured prompt; output validated with Zod.
 */

import { generateJson, type ImageInput } from '@server/lib/gemini';
import { DetectGarmentsResultSchema, type DetectGarmentsResult } from '@shared/ai-schemas/garment';

export const GARMENT_DETECTION_MODEL = 'gemini-2.5-flash';

const DETECT_GARMENTS_PROMPT = `You are a computer vision clothing detection and attribute extraction system.

TASK
Given ONE photo that may contain multiple garments (e.g., outfit laid out, wardrobe photo, influencer photo),
detect each DISTINCT wearable item and return a JSON object with an array of detections.

CRITICAL RULES
- Return ONLY valid JSON. No markdown. No code fences. No extra text.
- Use NORMALIZED bounding boxes (0..1) relative to the full image size.
- ONE call must return ALL detections. Do NOT ask for more images.
- Do NOT output pixel coordinates.
- If uncertain, LOWER confidence and include issues (inside garment_profile if present).

WHAT COUNTS AS A "GARMENT"
Include individual wearable items:
- tops/shirts/jackets
- bottoms (pants/shorts/skirts)
- dresses
- shoes
- bags
- accessories (only if clearly visible and meaningful; otherwise omit)
Do NOT include: faces, bodies, background objects, furniture, walls, text overlays, logos only.

DE-DUPLICATION / EDGE CASES
- If the same garment appears twice due to mirror/reflection, return ONE detection for the primary instance.
- If multiple garments overlap heavily and cannot be separated reliably:
  - return ONE detection with category="other"
  - lower confidence
  - explain ambiguity in issues.

CATEGORY (choose exactly one)
top, shirt, jacket, pants, shorts, skirt, dress, shoes, bag, accessory, other

BOUNDING BOX FORMAT
bbox = { x, y, w, h }
- x,y = top-left corner
- w,h = width and height
- all values must be numbers in [0, 1]
- boxes must be clamped within image bounds
- avoid tiny boxes (w*h < 0.01) unless it is a clear accessory

GARMENT PROFILE (optional but preferred when possible)
If you can reasonably infer attributes for a detection, include a garment_profile object with ONLY these keys:
{
  "category": "dress|top|shirt|jacket|pants|shorts|skirt|shoes|bag|accessory|other",
  "silhouette": "slim" | "straight" | "oversized" | "unknown",
  "length_class": "cropped" | "regular" | "long" | "maxi" | "unknown",
  "fit_intent": "tight" | "regular" | "oversized" | "unknown",
  "neckline": "crew" | "v_neck" | "square" | "turtleneck" | "collared" | "unknown",
  "sleeve": "sleeveless" | "short" | "long" | "unknown",
  "rise": "low" | "mid" | "high" | "unknown",
  "primary_colors": string[] (max 3, simple color words like "black", "white", "navy", "beige"),
  "pattern": "solid" | "stripe" | "check" | "print" | "unknown",
  "material_guess": "denim" | "knit" | "cotton" | "leather" | "synthetic" | "unknown",
  "formality": "casual" | "smart_casual" | "formal" | "unknown",
  "seasonality": "summer" | "winter" | "all_season" | "unknown",
  "attention_zones": ("shoulders" | "waist" | "hips" | "legs")[],
  "confidence": number (0..1),
  "issues": string[]
}

IMPORTANT:
- If you cannot infer a field, set it to "unknown" (for enums) or omit the entire garment_profile.
- Do NOT invent brands, prices, or product IDs.
- garment_profile.confidence is your overall confidence about the garment_profile (not bbox).

OUTPUT JSON (STRICT)
Return EXACTLY this shape:
{
  "detections": [
    {
      "bbox": { "x": 0.0, "y": 0.0, "w": 0.0, "h": 0.0 },
      "category": "top|shirt|jacket|pants|shorts|skirt|dress|shoes|bag|accessory|other",
      "label": "short human-readable label (max 80 chars)",
      "confidence": 0.0,
      "garment_profile": { ... } // optional
    }
  ]
}

QUALITY RULES
- Prefer fewer, higher-quality detections over many noisy ones.
- Return at most 20 detections.
- Sort detections by confidence descending.
- If no garments are clearly detectable, return:
  { "detections": [] }

Now analyze the image and output JSON only.`;

export type DetectGarmentsInput = {
  image: { buffer: Buffer; mimeType: string };
};

/**
 * One AI call per image → all detected garments with bbox (normalized 0..1), category, label, confidence.
 */
export async function detectGarmentsFromImage(
  input: DetectGarmentsInput
): Promise<DetectGarmentsResult> {
  const base64 = input.image.buffer.toString('base64');
  const images: ImageInput[] = [{ base64, mimeType: input.image.mimeType }];

  const result = await generateJson({
    prompt: DETECT_GARMENTS_PROMPT,
    schema: DetectGarmentsResultSchema,
    images,
    model: GARMENT_DETECTION_MODEL,
    timeoutMs: 30_000,
  });

  // Sort by confidence descending (prompt asks for it; enforce in code)
  const detections = [...result.detections].sort((a, b) => b.confidence - a.confidence);

  return { detections };
}
