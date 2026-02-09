/**
 * Gemini client via @google/genai.
 * Handles timeout, retries, JSON parsing, schema validation.
 */

import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { logger } from '@server/lib/logger';
import { GeminiClientError, GeminiParseError } from './errors';

const log = logger.child({ module: 'gemini' });

const DEFAULT_TIMEOUT_MS = 25_000;
const MAX_RETRIES = 2;

let clientInstance: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (clientInstance) return clientInstance;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiClientError('GEMINI_API_KEY is not set', 'CONFIG_ERROR');
  }
  clientInstance = new GoogleGenAI({ apiKey });
  return clientInstance;
}

/** Returns the shared Gemini client for advanced use cases. */
export function getGeminiClient(): GoogleGenAI {
  return getClient();
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status < 600);
}

function getStatusFromError(err: unknown): number | undefined {
  if (
    err &&
    typeof err === 'object' &&
    'status' in err &&
    typeof (err as { status: number }).status === 'number'
  ) {
    return (err as { status: number }).status;
  }
  return undefined;
}

function isRetryableNetwork(err: unknown): boolean {
  const name = err instanceof Error ? err.name : '';
  const message = err instanceof Error ? err.message : String(err);
  if (name === 'AbortError' || /abort/i.test(message)) return false;
  if (err instanceof TypeError && message.includes('fetch')) return true;
  if (/network|ECONNREFUSED|ETIMEDOUT/i.test(message)) return true;
  return false;
}

function delayMs(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt), 10_000);
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ImageInput = {
  base64: string;
  mimeType: string;
};

export type GenerateOptions = {
  model?: string;
  timeoutMs?: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// JSON Generation (with optional images input)
// ─────────────────────────────────────────────────────────────────────────────

export type GenerateJsonOptions<S extends z.ZodTypeAny> = GenerateOptions & {
  prompt: string;
  schema: S;
  images?: ImageInput[];
};

/**
 * Calls Gemini, parses JSON response, validates with Zod schema.
 * Retries on 429/5xx/network errors and on parse/schema validation errors
 * (up to MAX_RETRIES; on retry appends a strict-schema reminder to the prompt).
 */
export async function generateJson<S extends z.ZodTypeAny>(
  options: GenerateJsonOptions<S>
): Promise<z.output<S>> {
  const {
    prompt,
    schema,
    images,
    model = process.env.GEMINI_MODEL_TEXT ?? 'gemini-2.0-flash',
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  const requestId = crypto.randomUUID();
  const start = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const ai = getClient();

      const promptText =
        attempt > 0
          ? `${prompt}\n\n[RETRY] Your previous response failed schema validation. Return ONLY valid JSON that strictly matches the required structure and allowed enum values. No other values are accepted.`
          : prompt;

      // Build contents: text + optional images
      const contents: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> =
        [{ text: promptText }];

      if (images?.length) {
        for (const img of images) {
          contents.push({
            inlineData: { data: img.base64, mimeType: img.mimeType },
          });
        }
      }

      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          responseMimeType: 'application/json',
          abortSignal: controller.signal,
        },
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - start;
      const text = (response.text ?? '').trim();

      // Parse and validate JSON
      const json = extractJson(text);
      const parsed = tryParseJson(json);

      if (parsed === null) {
        throw new GeminiParseError('Invalid JSON from model');
      }

      const validated = schema.safeParse(parsed);
      if (!validated.success) {
        throw new GeminiParseError(`Schema validation failed: ${validated.error.message}`);
      }

      log.info({ requestId, latencyMs }, 'ok');
      return validated.data;
    } catch (err) {
      clearTimeout(timeout);
      const latencyMs = Date.now() - start;

      if (err instanceof GeminiParseError) {
        log.warn({ requestId, latencyMs, error: err.message }, 'parse_error');
        if (attempt < MAX_RETRIES) {
          const backoff = delayMs(attempt);
          log.warn(
            { requestId, attempt: attempt + 1, retryInMs: backoff, latencyMs },
            'parse_error retry'
          );
          await new Promise((r) => setTimeout(r, backoff));
          lastError = err;
          continue;
        }
        throw err;
      }

      const status = getStatusFromError(err);

      if (err instanceof Error && err.name === 'AbortError') {
        log.warn({ requestId, latencyMs }, 'timeout');
        throw new GeminiClientError('Gemini request timeout', 'GEMINI_TIMEOUT');
      }

      if (status !== undefined && isRetryableStatus(status) && attempt < MAX_RETRIES) {
        const backoff = delayMs(attempt);
        log.warn(
          { requestId, status, attempt: attempt + 1, retryInMs: backoff, latencyMs },
          'retry'
        );
        await new Promise((r) => setTimeout(r, backoff));
        lastError = err instanceof Error ? err : new Error(String(err));
        continue;
      }

      if (isRetryableNetwork(err) && attempt < MAX_RETRIES) {
        const backoff = delayMs(attempt);
        log.warn(
          { requestId, attempt: attempt + 1, retryInMs: backoff, latencyMs },
          'network_error retry'
        );
        await new Promise((r) => setTimeout(r, backoff));
        lastError = err instanceof Error ? err : new Error(String(err));
        continue;
      }

      const message = err instanceof Error ? err.message : String(err);
      const safeMessage = message.length > 200 ? `${message.slice(0, 200)}...` : message;
      if (status !== undefined) {
        throw new GeminiClientError(`Gemini API error: ${status}`, 'GEMINI_API_ERROR', status);
      }
      throw new GeminiClientError(safeMessage, 'GEMINI_ERROR');
    }
  }

  throw (
    lastError ?? new GeminiClientError('Gemini request failed after retries', 'GEMINI_RETRY_FAILED')
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Image Generation
// ─────────────────────────────────────────────────────────────────────────────

/** A content part: either text or an inline image. */
export type ContentPart = { text: string } | { inlineData: { data: string; mimeType: string } };

export type GenerateImageOptions = GenerateOptions & {
  prompt: string;
  images?: ImageInput[];
  /**
   * If set, overrides `prompt` + `images` with custom interleaved content parts.
   * Use this when you need text labels between images so the model knows which is which.
   */
  contentParts?: ContentPart[];
  /**
   * Response modalities. Default: ['image'].
   * Set to ['text', 'image'] when the model needs to reason before generating.
   */
  responseModalities?: string[];
};

export type GeneratedImage = {
  base64: string;
  mimeType: string;
};

/**
 * Calls Gemini to generate an image.
 * Returns base64 encoded image data.
 */
export async function generateImage(options: GenerateImageOptions): Promise<GeneratedImage> {
  const {
    prompt,
    images,
    contentParts,
    responseModalities = ['image'],
    model = 'gemini-2.5-flash-image',
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  const requestId = crypto.randomUUID();
  const start = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const ai = getClient();

      // If caller provides custom interleaved parts, use them directly.
      // Otherwise fall back to prompt-first, then images.
      let contents: ContentPart[];
      if (contentParts?.length) {
        contents = contentParts;
      } else {
        contents = [{ text: prompt }];
        if (images?.length) {
          for (const img of images) {
            contents.push({
              inlineData: { data: img.base64, mimeType: img.mimeType },
            });
          }
        }
      }

      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          responseModalities,
          abortSignal: controller.signal,
        },
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - start;

      // Extract image from response
      const parts = response.candidates?.[0]?.content?.parts;
      const imagePart = parts?.find((p) => p.inlineData);

      if (!imagePart?.inlineData) {
        throw new GeminiParseError('No image in response');
      }

      log.info({ requestId, latencyMs }, 'ok');
      return {
        base64: imagePart.inlineData.data ?? '',
        mimeType: imagePart.inlineData.mimeType ?? 'image/png',
      };
    } catch (err) {
      clearTimeout(timeout);
      const latencyMs = Date.now() - start;

      if (err instanceof GeminiParseError) {
        log.warn({ requestId, latencyMs, error: err.message }, 'parse_error');
        throw err;
      }

      const status = getStatusFromError(err);

      if (err instanceof Error && err.name === 'AbortError') {
        log.warn({ requestId, latencyMs }, 'timeout');
        throw new GeminiClientError('Gemini request timeout', 'GEMINI_TIMEOUT');
      }

      if (status !== undefined && isRetryableStatus(status) && attempt < MAX_RETRIES) {
        const backoff = delayMs(attempt);
        log.warn(
          { requestId, status, attempt: attempt + 1, retryInMs: backoff, latencyMs },
          'retry'
        );
        await new Promise((r) => setTimeout(r, backoff));
        lastError = err instanceof Error ? err : new Error(String(err));
        continue;
      }

      if (isRetryableNetwork(err) && attempt < MAX_RETRIES) {
        const backoff = delayMs(attempt);
        log.warn(
          { requestId, attempt: attempt + 1, retryInMs: backoff, latencyMs },
          'network_error retry'
        );
        await new Promise((r) => setTimeout(r, backoff));
        lastError = err instanceof Error ? err : new Error(String(err));
        continue;
      }

      const message = err instanceof Error ? err.message : String(err);
      const safeMessage = message.length > 200 ? `${message.slice(0, 200)}...` : message;
      if (status !== undefined) {
        throw new GeminiClientError(`Gemini API error: ${status}`, 'GEMINI_API_ERROR', status);
      }
      throw new GeminiClientError(safeMessage, 'GEMINI_ERROR');
    }
  }

  throw (
    lastError ?? new GeminiClientError('Gemini request failed after retries', 'GEMINI_RETRY_FAILED')
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function extractJson(text: string): string {
  const trimmed = text.trim();
  const codeBlock = /^```(?:json)?\s*([\s\S]*?)```\s*$/m.exec(trimmed);
  if (codeBlock && codeBlock[1]) return codeBlock[1].trim();
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

function tryParseJson(str: string): unknown | null {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}
