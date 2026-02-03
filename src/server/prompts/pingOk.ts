import { z } from 'zod';
import { generateJson } from '@server/lib/gemini';

const okSchema = z.object({ ok: z.literal(true) });

const PROMPT = 'Return ONLY valid JSON exactly: {"ok":true}. No markdown. No extra keys.';

/**
 * Ping AI to verify it's working.
 * Returns { ok: true } on success.
 */
export async function pingOk(): Promise<{ ok: true }> {
  return generateJson({
    prompt: PROMPT,
    schema: okSchema,
  });
}
