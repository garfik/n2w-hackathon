import { z } from 'zod';

// ─── Detection: single source of truth for prompt + schema ────────────────────

export const DETECT_CATEGORIES = [
  'top',
  'shirt',
  'jacket',
  'pants',
  'shorts',
  'skirt',
  'dress',
  'shoes',
  'headwear',
] as const;

export const DETECT_SILHOUETTES = ['slim', 'straight', 'regular', 'oversized', 'unknown'] as const;
export const DETECT_LENGTH_CLASS = [
  'cropped',
  'short',
  'regular',
  'long',
  'maxi',
  'unknown',
] as const;
export const DETECT_FIT_INTENT = ['tight', 'regular', 'oversized', 'unknown'] as const;
export const DETECT_NECKLINE = [
  'crew',
  'v_neck',
  'square',
  'turtleneck',
  'collared',
  'unknown',
] as const;
export const DETECT_SLEEVE = ['sleeveless', 'short', 'long', 'unknown'] as const;
export const DETECT_RISE = ['low', 'mid', 'high', 'unknown'] as const;
export const DETECT_PATTERN = ['solid', 'stripe', 'check', 'print', 'unknown'] as const;
export const DETECT_MATERIAL = [
  'denim',
  'knit',
  'cotton',
  'leather',
  'suede',
  'synthetic',
  'linen',
  'unknown',
] as const;
export const DETECT_FORMALITY = ['casual', 'smart_casual', 'formal', 'unknown'] as const;
export const DETECT_SEASONALITY = ['summer', 'winter', 'all_season', 'unknown'] as const;
export const DETECT_ATTENTION_ZONES = ['shoulders', 'waist', 'hips', 'legs'] as const;

export const DETECT_MAX_DETECTIONS = 10;
export const DETECT_LABEL_MAX_LENGTH = 80;
export const DETECT_STYLE_TAGS_MAX = 6;
export const DETECT_PRIMARY_COLORS_MAX = 3;

// ─── Detection schemas (must stay in sync with DETECT_* constants) ───────────

const BboxNormSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0).max(1),
  h: z.number().min(0).max(1),
});

const CategorySchema = z.enum(DETECT_CATEGORIES);

export const DetectionGarmentProfileSchema = z.object({
  category: CategorySchema.optional(),
  silhouette: z.enum(DETECT_SILHOUETTES).optional(),
  length_class: z.enum(DETECT_LENGTH_CLASS).optional(),
  fit_intent: z.enum(DETECT_FIT_INTENT).optional(),
  neckline: z.enum(DETECT_NECKLINE).optional(),
  sleeve: z.enum(DETECT_SLEEVE).optional(),
  rise: z.enum(DETECT_RISE).optional(),
  primary_colors: z.array(z.string()).max(DETECT_PRIMARY_COLORS_MAX).optional(),
  pattern: z.enum(DETECT_PATTERN).optional(),
  material_guess: z.enum(DETECT_MATERIAL).optional(),
  formality: z.enum(DETECT_FORMALITY).optional(),
  seasonality: z.enum(DETECT_SEASONALITY).optional(),
  attention_zones: z.array(z.enum(DETECT_ATTENTION_ZONES)).optional(),
  style_family: z.string().optional(),
  style_tags: z.array(z.string()).max(DETECT_STYLE_TAGS_MAX).optional(),
  confidence: z.number().min(0).max(1).optional(),
  issues: z.array(z.string()).optional(),
});

export const GarmentDetectionItemSchema = z.object({
  bbox: BboxNormSchema,
  category: CategorySchema,
  label: z.string().max(DETECT_LABEL_MAX_LENGTH),
  confidence: z.number().min(0).max(1),
  garment_profile: DetectionGarmentProfileSchema.optional(),
});

export const DetectGarmentsResultSchema = z.object({
  detections: z.array(GarmentDetectionItemSchema).max(DETECT_MAX_DETECTIONS),
});

export type GarmentDetectionItem = z.infer<typeof GarmentDetectionItemSchema>;
export type DetectGarmentsResult = z.infer<typeof DetectGarmentsResultSchema>;

// ─── Single garment profile (legacy / other use) ──────────────────────────────

/**
 * AI (Gemini) output schema: garment profile from image analysis.
 */
export const GarmentProfileSchema = z.object({
  category: z.enum([
    'dress',
    'top',
    'shirt',
    'jacket',
    'coat',
    'pants',
    'jeans',
    'skirt',
    'shorts',
    'shoes',
    'other',
  ]),
  silhouette: z.enum(['slim', 'straight', 'relaxed', 'oversized', 'a_line', 'other']),
  length_class: z.enum(['cropped', 'regular', 'long', 'maxi', 'unknown']),
  fit_intent: z.enum(['tight', 'regular', 'oversized', 'unknown']),
  neckline: z.enum(['crew', 'v_neck', 'square', 'turtleneck', 'collar', 'strapless', 'unknown']),
  sleeve: z.enum(['sleeveless', 'short', 'three_quarter', 'long', 'unknown']),
  rise: z.enum(['low', 'mid', 'high', 'unknown']),
  primary_colors: z.array(z.string()).max(5),
  pattern: z.enum(['solid', 'stripe', 'check', 'floral', 'graphic', 'other', 'unknown']),
  material_guess: z.enum([
    'denim',
    'knit',
    'cotton',
    'wool',
    'leather',
    'suede',
    'synthetic',
    'linen',
    'other',
    'unknown',
  ]),
  formality: z.enum(['casual', 'smart_casual', 'formal', 'unknown']),
  seasonality: z.enum(['summer', 'winter', 'all_season', 'unknown']),
  attention_zones: z.array(z.enum(['shoulders', 'waist', 'hips', 'legs', 'none'])).max(4),
  confidence: z.number().min(0).max(1),
  issues: z.array(z.string()).default([]),
});

export type GarmentProfile = z.infer<typeof GarmentProfileSchema>;
