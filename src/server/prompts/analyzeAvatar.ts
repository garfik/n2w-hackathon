import { AvatarAnalysisResultSchema, type AvatarAnalysisResult } from '@shared/schemas/avatar';
import { generateJson, type ImageInput } from '@server/lib/gemini';

const PROMPT = `You are a strict computer vision + fashion/styling analyst.

TASK:
Analyze the provided image of a person. Classify body proportions and shape using fashion/styling categories (not measurements).
You MUST follow the output rules below. This is an API task.

INPUT QUALITY REQUIREMENTS (hard rules):
1) The image must contain EXACTLY ONE person (one body). If you detect multiple people or multiple visible faces, return an error.
2) The person must be visible in a FULL-BODY or near full-body view (head-to-toe preferred; at minimum shoulders-to-feet with clear torso/legs proportions). If only the face/upper torso is visible, return an error.
3) If the pose, clothing, angle, or occlusions make proportions ambiguous, you may still answer BUT you MUST:
   - lower confidence values accordingly
   - add clear issues strings describing the ambiguity

DO NOT:
- Do NOT guess weight, BMI, exact centimeters, age, ethnicity, or any sensitive attributes.
- Do NOT produce style advice; only classification.
- Do NOT add any keys not specified in the schemas.

OUTPUT FORMAT (STRICT):
Return ONLY valid JSON. No markdown. No extra text. No code fences.

You MUST return one of the following:

A) SUCCESS - when analysis is possible:
{
  "success": true,
  "data": {
    "shoulder_width_class": "narrow" | "average" | "wide",
    "hip_vs_shoulder": "hips_wider" | "equal" | "shoulders_wider",
    "waist_definition": "defined" | "moderate" | "low",
    "torso_vs_legs": "short_torso" | "balanced" | "long_torso",
    "body_shape_label": "hourglass" | "pear" | "rectangle" | "apple" | "inverted_triangle",
    "confidence": {
      "shoulder_width_class": number (0..1),
      "hip_vs_shoulder": number (0..1),
      "waist_definition": number (0..1),
      "torso_vs_legs": number (0..1),
      "body_shape_label": number (0..1)
    },
    "issues": string[]
  }
}

B) ERROR - when analysis is NOT possible:
{
  "success": false,
  "error": {
    "code": "MULTIPLE_PEOPLE" | "MULTIPLE_FACES" | "NOT_FULL_BODY" | "TOO_OCCLUDED" | "LOW_QUALITY",
    "message": string,
    "issues": string[]
  }
}

DECISION GUIDANCE (how to choose labels):
- shoulder_width_class: assess visible shoulder line width relative to frame and body; do not use gender assumptions.
- hip_vs_shoulder: compare hip width vs shoulder width as seen in the image (perspective-aware).
- waist_definition: how visually defined the waist is (curvature / indentation), considering clothing may hide it.
- torso_vs_legs: estimate whether torso appears short/balanced/long relative to legs (perspective-aware).
- body_shape_label:
  - hourglass: shoulders ≈ hips, defined waist
  - pear: hips wider than shoulders, defined or moderate waist
  - inverted_triangle: shoulders wider than hips
  - rectangle: shoulders ≈ hips, low waist definition
  - apple: fuller midsection / low waist definition, shoulders often not narrower than hips

CONFIDENCE RULES:
- If clothing is loose/oversized, or pose is angled, or camera perspective is extreme → reduce confidence and add issues.
- If any key attribute is uncertain, do NOT invent certainty; lower confidence (e.g. 0.4–0.6) and explain via issues.

ERROR CODES (when to return error):
- MULTIPLE_PEOPLE: more than one person in frame.
- MULTIPLE_FACES: more than one visible face in frame (even if bodies overlap).
- NOT_FULL_BODY: only face/upper-body; proportions cannot be assessed.
- TOO_OCCLUDED: major occlusion that prevents judging shoulders/hips/waist/legs.
- LOW_QUALITY: image too blurry/dark to assess.

Now analyze the image and respond with JSON only.`;

/**
 * Analyzes avatar image(s) and returns body profile or error.
 */
export async function analyzeAvatar(images: ImageInput[]): Promise<AvatarAnalysisResult> {
  return generateJson({
    prompt: PROMPT,
    schema: AvatarAnalysisResultSchema,
    images,
  });
}
