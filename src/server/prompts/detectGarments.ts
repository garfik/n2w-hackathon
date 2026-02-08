/**
 * Garment detection from a single image: ONE AI call returns array of detections.
 * Uses Gemini vision + structured prompt; output validated with Zod.
 * Prompt enum values are generated from @shared/ai-schemas/garment so they stay in sync.
 */

import { generateJson, type ImageInput } from '@server/lib/gemini';
import {
  DetectGarmentsResultSchema,
  type DetectGarmentsResult,
  DETECT_CATEGORIES,
  DETECT_SILHOUETTES,
  DETECT_LENGTH_CLASS,
  DETECT_FIT_INTENT,
  DETECT_NECKLINE,
  DETECT_SLEEVE,
  DETECT_RISE,
  DETECT_PATTERN,
  DETECT_MATERIAL,
  DETECT_FORMALITY,
  DETECT_SEASONALITY,
  DETECT_ATTENTION_ZONES,
  DETECT_MAX_DETECTIONS,
  DETECT_LABEL_MAX_LENGTH,
  DETECT_STYLE_TAGS_MAX,
  DETECT_PRIMARY_COLORS_MAX,
} from '@shared/ai-schemas/garment';

export const GARMENT_DETECTION_MODEL = process.env.GARMENT_DETECTION_MODEL || 'gemini-2.5-flash';

const categoryList = DETECT_CATEGORIES.join('|');
const silhouetteList = DETECT_SILHOUETTES.map((s) => `"${s}"`).join(' | ');
const lengthClassList = DETECT_LENGTH_CLASS.map((s) => `"${s}"`).join(' | ');
const fitIntentList = DETECT_FIT_INTENT.map((s) => `"${s}"`).join(' | ');
const necklineList = DETECT_NECKLINE.map((s) => `"${s}"`).join(' | ');
const sleeveList = DETECT_SLEEVE.map((s) => `"${s}"`).join(' | ');
const riseList = DETECT_RISE.map((s) => `"${s}"`).join(' | ');
const patternList = DETECT_PATTERN.map((s) => `"${s}"`).join(' | ');
const materialList = DETECT_MATERIAL.map((s) => `"${s}"`).join(' | ');
const formalityList = DETECT_FORMALITY.map((s) => `"${s}"`).join(' | ');
const seasonalityList = DETECT_SEASONALITY.map((s) => `"${s}"`).join(' | ');
const attentionZonesList = DETECT_ATTENTION_ZONES.map((s) => `"${s}"`).join(' | ');

export const DETECT_GARMENTS_PROMPT = `You are a computer vision clothing detection and attribute extraction system.

GOAL
Detect only the main wardrobe items in ONE photo (flat lay or outfit on a person) and return structured data suitable for outfit scoring.

ALLOWED ITEMS (ONLY)
- Upper body: top, shirt, jacket
- Lower body: pants, shorts, skirt, dress
- Footwear: shoes (only if clearly visible)
- Headwear: headwear (only if clearly visible)

If an item is NOT one of the allowed categories or you are not confident, DO NOT return it.

EXPLICITLY IGNORE (never return)
- socks, underwear, lingerie
- watches, jewelry, rings, necklaces, bracelets
- belts, ties, scarves, gloves
- bags/backpacks, wallets
- sunglasses, phones, headphones
- tiny accessories or unclear small items
- faces, bodies as objects, background/furniture/walls
- text overlays, logos-only regions

OUTPUT FORMAT (STRICT)
Return ONLY valid JSON. No markdown. No code fences. No extra text.

You MUST return exactly:
{
  "detections": [
    {
      "bbox": { "x": 0..1, "y": 0..1, "w": 0..1, "h": 0..1 },
      "category": "${categoryList}",
      "label": "short user-facing label (<=${DETECT_LABEL_MAX_LENGTH} chars)",
      "confidence": 0..1,
      "garment_profile": { ... } // optional
    }
  ]
}

FIELD MEANINGS (for you; do NOT output this text)
- detections: array of distinct garments detected in the image
- bbox: normalized bounding box (top-left origin). x,y are top-left; w,h are width/height.
- category: one of allowed categories only.
- label: short label like "black hoodie", "blue jeans", "white shirt", "black sneakers".
- confidence: your confidence that the detection is correct (bbox+category+label).
- garment_profile: optional detailed attributes. If uncertain, use "unknown" or omit garment_profile entirely.

BOUNDING BOX RULES
- Use NORMALIZED coordinates (0..1), NOT pixels.
- bbox must stay within image bounds (clamp if needed).
- Ignore tiny/unclear items:
  - clothing categories (top/shirt/jacket/pants/shorts/skirt/dress): ignore if area (w*h) < 0.02
  - shoes/headwear: ignore if area (w*h) < 0.03
- If wearing layers (person photo):
  - Prefer OUTERMOST upper layer (e.g., jacket/coat over shirt).
  - You MAY include a second upper item only if clearly separable and not noisy.

STYLE OUTPUT (brand_style + tags)
Inside garment_profile, add:
- style_family: a broad style family label that feels like a brand aesthetic (e.g., "streetwear", "minimal", "athleisure", "workwear", "preppy", "formal", "boho", "classic", "sporty", "techwear", "y2k", "romantic", "edgy", "outdoor").
- style_tags: 2–${DETECT_STYLE_TAGS_MAX} short tags that describe the vibe/features (e.g., "oversized", "cropped", "clean lines", "chunky sole", "tailored", "vintage", "sleek", "cozy", "utility", "high contrast").
If you are not confident, use style_family="unknown" and style_tags=[].

GARMENT PROFILE (optional but preferred when possible)
If you can reasonably infer attributes for a detection, include garment_profile with ONLY these keys:
{
  "category": "${categoryList}",
  "silhouette": ${silhouetteList},
  "length_class": ${lengthClassList},
  "fit_intent": ${fitIntentList},
  "neckline": ${necklineList},
  "sleeve": ${sleeveList},
  "rise": ${riseList},
  "primary_colors": string[] (max ${DETECT_PRIMARY_COLORS_MAX}, simple color words like "black","white","navy","beige"),
  "pattern": ${patternList},
  "material_guess": ${materialList},
  "formality": ${formalityList},
  "seasonality": ${seasonalityList},
  "attention_zones": (${attentionZonesList})[],
  "style_family": string,        // use "unknown" if unsure
  "style_tags": string[],        // 2–${DETECT_STYLE_TAGS_MAX} tags, or [] if unsure
  "confidence": number (0..1),   // confidence in garment_profile only
  "issues": string[]             // ambiguities (lighting, occlusion, overlap, etc.)
}

IMPORTANT RULES
- If you cannot infer a field, set it to "unknown" or leave arrays empty.
- Do NOT invent brands, prices, product IDs, or model names.
- Sort detections by confidence descending.
- Return at most ${DETECT_MAX_DETECTIONS} detections.
- If no relevant garments are clearly detectable, return: { "detections": [] }.

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
