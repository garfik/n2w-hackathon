import { z } from 'zod';

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
