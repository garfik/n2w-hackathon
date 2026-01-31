import { z } from "zod";
import { GeminiParseError } from "./errors";

/**
 * Extracts a JSON string from model output (handles ```json ... ``` or plain text).
 */
export function extractJsonStrict(text: string): string {
  const trimmed = text.trim();
  const codeBlock = /^```(?:json)?\s*([\s\S]*?)```\s*$/m.exec(trimmed);
  if (codeBlock && codeBlock[1]) return codeBlock[1].trim();
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

export const parseOkSchema = z.object({ ok: z.literal(true) });
export type ParseOkResult = z.infer<typeof parseOkSchema>;

export type GeminiCallWithPrompt = (prompt: string) => Promise<string>;

const INITIAL_PROMPT =
  'Return ONLY valid JSON exactly: {"ok":true}. No markdown. No extra keys.';
const REPAIR_PROMPT =
  'Return ONLY valid JSON exactly: {"ok":true}. No markdown. No extra keys.';

/**
 * Calls the model via callWithPrompt(initialPrompt), extracts JSON, parses with parseOkSchema.
 * On parse failure: one repair retry with REPAIR_PROMPT, then throws GeminiParseError.
 */
export async function safeGeminiOk(
  callWithPrompt: GeminiCallWithPrompt
): Promise<ParseOkResult> {
  let raw = await callWithPrompt(INITIAL_PROMPT);
  let candidate = extractJsonStrict(raw);
  let parsed = parseOkSchema.safeParse(tryParseJsonSafe(candidate));

  if (!parsed.success) {
    raw = await callWithPrompt(REPAIR_PROMPT);
    candidate = extractJsonStrict(raw);
    const repaired = tryParseJsonSafe(candidate);
    if (repaired === null) {
      throw new GeminiParseError("Invalid JSON from model");
    }
    parsed = parseOkSchema.safeParse(repaired);
  }

  if (!parsed.success) {
    throw new GeminiParseError("Model did not return valid { ok: true } JSON");
  }
  return parsed.data;
}

/** Returns parsed value or null on JSON parse error (no throw). */
function tryParseJsonSafe(str: string): unknown | null {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}
