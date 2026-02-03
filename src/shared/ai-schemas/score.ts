import { z } from 'zod';

/**
 * AI (Gemini) output schema: outfit score from analysis.
 */
export const OutfitScoreSchema = z.object({
  scores: z.object({
    fit_balance: z.number().int().min(0).max(100),
    proportions: z.number().int().min(0).max(100),
    color_harmony: z.number().int().min(0).max(100),
    occasion_match: z.number().int().min(0).max(100),
    season_material: z.number().int().min(0).max(100),
    overall: z.number().int().min(0).max(100),
  }),
  verdict: z.enum(['great', 'ok', 'not_recommended']),
  why: z.array(z.string()).min(1).max(8),
  improvements: z.array(z.string()).min(1).max(8),
  alternatives: z.array(z.string()).min(0).max(6),
});

export type OutfitScore = z.infer<typeof OutfitScoreSchema>;
