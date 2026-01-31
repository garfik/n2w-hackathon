import { generateText } from "./client";
import { safeGeminiOk } from "./json";

const DEFAULT_MODEL = "gemini-2.0-flash";

/**
 * Ping Gemini: request { "ok": true } JSON, validate with Zod, return result.
 */
export async function pingOk(): Promise<{ ok: true }> {
  const model = process.env.GEMINI_MODEL_TEXT ?? DEFAULT_MODEL;
  const result = await safeGeminiOk((prompt) =>
    generateText({ prompt, model })
  );
  return result;
}

export { generateText, getGeminiClient } from "./client";
export { extractJsonStrict, parseOkSchema, safeGeminiOk } from "./json";
export { GeminiClientError, GeminiParseError } from "./errors";
