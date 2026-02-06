import { z } from 'zod';

// ─── Detection (one image → many detections) ─────────────────────────────────

const BboxNormSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});

const CategorySchema = z.enum([
  'top',
  'shirt',
  'jacket',
  'pants',
  'shorts',
  'skirt',
  'dress',
  'shoes',
  'bag',
  'accessory',
  'other',
]);

/** Optional garment profile returned per detection by vision model. */
export const DetectionGarmentProfileSchema = z
  .object({
    category: CategorySchema.optional(),
    silhouette: z.enum(['slim', 'straight', 'oversized', 'unknown']).optional(),
    length_class: z.enum(['cropped', 'regular', 'long', 'maxi', 'unknown']).optional(),
    fit_intent: z.enum(['tight', 'regular', 'oversized', 'unknown']).optional(),
    neckline: z.enum(['crew', 'v_neck', 'square', 'turtleneck', 'collared', 'unknown']).optional(),
    sleeve: z.enum(['sleeveless', 'short', 'long', 'unknown']).optional(),
    rise: z.enum(['low', 'mid', 'high', 'unknown']).optional(),
    primary_colors: z.array(z.string()).max(3).optional(),
    pattern: z.enum(['solid', 'stripe', 'check', 'print', 'unknown']).optional(),
    material_guess: z
      .enum(['denim', 'knit', 'cotton', 'leather', 'synthetic', 'unknown'])
      .optional(),
    formality: z.enum(['casual', 'smart_casual', 'formal', 'unknown']).optional(),
    seasonality: z.enum(['summer', 'winter', 'all_season', 'unknown']).optional(),
    attention_zones: z.array(z.enum(['shoulders', 'waist', 'hips', 'legs'])).optional(),
    confidence: z.number().min(0).max(1).optional(),
    issues: z.array(z.string()).optional(),
  })
  .passthrough();

export const GarmentDetectionItemSchema = z.object({
  bbox: BboxNormSchema,
  category: CategorySchema,
  label: z.string(),
  confidence: z.number(),
  garment_profile: DetectionGarmentProfileSchema.optional(),
});

export const DetectGarmentsResultSchema = z.object({
  detections: z.array(GarmentDetectionItemSchema).max(20),
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
    'synthetic',
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
