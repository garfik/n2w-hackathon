import { z } from 'zod';

/**
 * AvatarBodyProfileSchema
 *
 * Purpose:
 * A compact, styling-oriented description of a person's body/appearance inferred from a single full-body photo,
 * plus optional manual overrides. This is NOT a biometric or medical profile.
 *
 * Design goals:
 * - Use categorical labels (no weight/BMI/precise measurements).
 * - Allow uncertainty via `unknown` + per-field confidence and `issues`.
 * - Provide enough signals to score: fit & balance, proportions, and color harmony.
 *
 * Notes:
 * - `height_cm` is manual user input (optional). Do not infer it from the image.
 * - If the image is not suitable (not full body, multiple people/faces, too occluded, low quality),
 *   the analysis endpoint should return an error instead of forcing this schema.
 */
export const AvatarBodyProfileSchema = z.object({
  /**
   * Manual override (optional): user's height in centimeters.
   * Why: helps proportion scoring (e.g., cropped vs maxi length) without guessing measurements from the image.
   */
  // height_cm: z.number().int().min(120).max(230).optional(),

  /**
   * Shoulder width category as it appears visually.
   * Why: impacts jacket structure, neckline balance, and overall silhouette harmony.
   */
  shoulder_width_class: z.enum(['narrow', 'average', 'wide', 'unknown']),

  /**
   * Relative hip vs shoulder width as it appears visually.
   * Why: key driver of silhouette balancing (e.g., pear vs inverted triangle styling logic).
   */
  hip_vs_shoulder: z.enum(['hips_wider', 'equal', 'shoulders_wider', 'unknown']),

  /**
   * How visually defined the waist is (may be affected by clothing).
   * Why: influences whether waist-emphasizing garments help or hurt balance.
   */
  waist_definition: z.enum(['defined', 'moderate', 'low', 'unknown']),

  /**
   * Apparent torso-to-legs ratio category (perspective-aware).
   * Why: drives length and rise choices (cropped tops, high-rise pants, etc.).
   */
  torso_vs_legs: z.enum(['short_torso', 'balanced', 'long_torso', 'unknown']),

  /**
   * Overall body shape label (high-level summary).
   * Why: useful for quick explanations and defaults; should align with the fields above.
   */
  body_shape_label: z.enum([
    'hourglass',
    'pear',
    'rectangle',
    'apple',
    'inverted_triangle',
    'unknown',
  ]),

  /**
   * Body volume category (visual, non-medical).
   * Why: improves fit scoring (tight/regular/oversized) and fabric drape expectations.
   * Important: if clothing hides body contours, use "unknown" and add issues.
   */
  body_volume: z.enum(['slim', 'average', 'curvy', 'plus', 'unknown']),

  /**
   * Apparent verticality (styling shorthand), NOT a measurement.
   * Why: helps reason about garment lengths and "elongation" effects.
   * If unsure or if the image lacks reference, use "unknown".
   */
  verticality: z.enum(['petite', 'regular', 'tall', 'unknown']),

  /**
   * Shoulder line/slope.
   * Why: helps evaluate structured vs soft garments, shoulder padding, and certain necklines.
   */
  shoulder_slope: z.enum(['sloped', 'neutral', 'square', 'unknown']),

  /**
   * Neck length category.
   * Why: informs neckline choices (crew vs v-neck vs turtleneck) and perceived proportion.
   */
  neck_length: z.enum(['short', 'average', 'long', 'unknown']),

  /**
   * Skin undertone category for color harmony.
   * Why: improves color scoring (cool vs warm palettes).
   * If lighting is unreliable, use "unknown".
   */
  undertone: z.enum(['cool', 'neutral', 'warm', 'olive', 'unknown']),

  /**
   * Overall contrast level (face/hair/skin contrast as a styling heuristic).
   * Why: helps reason about high-contrast patterns vs soft/low-contrast palettes.
   * If unsure, use "unknown".
   */
  contrast_level: z.enum(['low', 'medium', 'high', 'unknown']),

  /**
   * Per-field confidence scores (0..1).
   * Why: allows UI to show uncertainty and lets scoring logic down-weight unreliable attributes.
   * Rule: lower confidence when pose/angle/lighting/occlusion/clothing makes inference hard.
   */
  confidence: z.object({
    shoulder_width_class: z.number().min(0).max(1),
    hip_vs_shoulder: z.number().min(0).max(1),
    waist_definition: z.number().min(0).max(1),
    torso_vs_legs: z.number().min(0).max(1),
    body_shape_label: z.number().min(0).max(1),
    body_volume: z.number().min(0).max(1),
    verticality: z.number().min(0).max(1),
    shoulder_slope: z.number().min(0).max(1),
    neck_length: z.number().min(0).max(1),
    undertone: z.number().min(0).max(1),
    contrast_level: z.number().min(0).max(1),
  }),

  /**
   * Free-form warnings/ambiguities about the analysis.
   * Examples:
   * - "oversized clothing hides waist definition"
   * - "strong camera angle may distort hip_vs_shoulder"
   * - "low light makes undertone uncertain"
   */
  issues: z.array(z.string()).default([]),
});

export type AvatarBodyProfile = z.output<typeof AvatarBodyProfileSchema>;

export const AvatarAnalysisErrorCode = z.enum([
  'MULTIPLE_PEOPLE',
  'MULTIPLE_FACES',
  'NOT_FULL_BODY',
  'TOO_OCCLUDED',
  'LOW_QUALITY',
]);

export const AvatarAnalysisErrorSchema = z.object({
  code: AvatarAnalysisErrorCode,
  message: z.string(),
  issues: z.array(z.string()).default([]),
});

export type AvatarAnalysisError = z.output<typeof AvatarAnalysisErrorSchema>;

export const AvatarAnalysisResultSchema = z.discriminatedUnion('success', [
  z.object({
    success: z.literal(true),
    data: AvatarBodyProfileSchema,
  }),
  z.object({
    success: z.literal(false),
    error: AvatarAnalysisErrorSchema,
  }),
]);

export type AvatarAnalysisResult = z.output<typeof AvatarAnalysisResultSchema>;
