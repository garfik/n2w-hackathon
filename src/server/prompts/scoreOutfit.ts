import { OutfitScoreSchema } from '@shared/ai-schemas/score';
import { generateJson } from '@server/lib/gemini';

export const OUTFIT_SCORE_MODEL = process.env.OUTFIT_SCORE_MODEL || 'gemini-2.5-flash';

export const OUTFIT_SCORE_PROMPT = `You are a strict fashion/styling scoring engine.

TASK:
Score the outfit composed of the provided garments for the given person's body profile and occasion.
Return ONLY valid JSON that matches the required schema. No markdown. No extra text. No code fences.

INPUT FORMAT:
You will receive a JSON object with:
- avatarProfile: the person's body/appearance classification (shoulder width, hip ratio, waist definition, body shape, volume, undertone, contrast, etc.)
- occasion: the event/context the outfit is intended for (e.g. casual, work, formal, date, sport, party)
- garments: array of garment objects. Each garment has:
  - name: garment name (may be null)
  - category: garment category (may be null)
  - garmentProfile: detailed AI-detected garment profile (may be null if not analyzed yet)

SCORING CRITERIA (0–100 for each):

1. fit_balance (0–100): How well the garment fits/silhouettes balance the body proportions.
   - Consider shoulder width, hip ratio, waist definition, body volume.
   - Balanced silhouettes score higher; top-heavy or bottom-heavy combos score lower.

2. proportions (0–100): How the garment lengths/cuts affect perceived proportions.
   - Consider torso_vs_legs, verticality, garment lengths, rise heights.
   - Elongating effects on short torso = good. Cropped top on long torso = less ideal.

3. color_harmony (0–100): How the garment colors work with the person's coloring and with each other.
   - Consider undertone, contrast_level, and garment color profiles.
   - Harmonious palettes score higher; clashing undertones score lower.

4. occasion_match (0–100): How appropriate the outfit is for the stated occasion.
   - Formal garments for casual occasion = lower score. Sport items for date = lower.
   - Perfect occasion alignment = 90–100.

5. season_material (0–100): How appropriate the materials/fabrics are.
   - Consider weight, breathability, layering compatibility.
   - If garment profiles are missing, default to 60 and note in "why".

6. overall (0–100): Weighted average reflecting holistic outfit quality.
   - Roughly: (fit_balance*0.25 + proportions*0.2 + color_harmony*0.2 + occasion_match*0.2 + season_material*0.15)
   - You may adjust ±5 based on overall cohesion.

VERDICT:
- "great": overall >= 75
- "ok": 50 <= overall < 75
- "not_recommended": overall < 50

MISSING DATA HANDLING:
- If a garment has no garmentProfile (null), you MUST:
  - Lower the relevant score categories by 10–20 points (since you can't fully assess fit/color/material)
  - Mention this in "why" (e.g. "garment 'Blue Shirt' lacks profile data; scores may be imprecise")
- If avatarProfile has many "unknown" fields, lower confidence in related scores and explain in "why".

OUTPUT SCHEMA (strict):
{
  "scores": {
    "fit_balance": number (0–100, integer),
    "proportions": number (0–100, integer),
    "color_harmony": number (0–100, integer),
    "occasion_match": number (0–100, integer),
    "season_material": number (0–100, integer),
    "overall": number (0–100, integer)
  },
  "verdict": "great" | "ok" | "not_recommended",
  "why": string[] (1–8 items, explain score reasoning),
  "improvements": string[] (1–8 items, actionable suggestions),
  "alternatives": string[] (0–6 items, alternative garment suggestions if relevant)
}

Now analyze the provided input and respond with JSON only.`;

/**
 * Build the full prompt with injected data.
 */
function buildPrompt(input: {
  avatarProfile: unknown;
  occasion: string;
  garments: Array<{ name: string | null; category: string | null; garmentProfile: unknown }>;
}): string {
  const dataBlock = JSON.stringify(input, null, 2);
  return `${OUTFIT_SCORE_PROMPT}\n\nINPUT:\n${dataBlock}`;
}

/**
 * Score an outfit using AI.
 */
export async function scoreOutfit(input: {
  avatarProfile: unknown;
  occasion: string;
  garments: Array<{ name: string | null; category: string | null; garmentProfile: unknown }>;
  outfitId: string;
}) {
  return generateJson({
    prompt: buildPrompt(input),
    schema: OutfitScoreSchema,
    model: OUTFIT_SCORE_MODEL,
    timeoutMs: 30_000,
    promptType: 'outfit_scoring',
    relatedId: input.outfitId,
  });
}
