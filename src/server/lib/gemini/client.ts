/**
 * Gemini client via @google/genai. Timeout, retries, request-id/latencyMs in logs.
 * Never logs API key.
 */

import { GoogleGenAI } from "@google/genai";
import { logger } from "@server/lib/logger";
import { GeminiClientError } from "./errors";

const log = logger.child({ module: "gemini" });

const DEFAULT_TIMEOUT_MS = 25_000;
const MAX_RETRIES = 2;

let clientInstance: GoogleGenAI | null = null;

/** Returns the shared Gemini client (for generateContent, streams, images, etc.). Never logs API key. */
export function getGeminiClient(): GoogleGenAI {
  return getClient();
}

function getClient(): GoogleGenAI {
  if (clientInstance) return clientInstance;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiClientError("GEMINI_API_KEY is not set", "CONFIG_ERROR");
  }
  clientInstance = new GoogleGenAI({ apiKey });
  return clientInstance;
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status < 600);
}

function getStatusFromError(err: unknown): number | undefined {
  if (err && typeof err === "object" && "status" in err && typeof (err as { status: number }).status === "number") {
    return (err as { status: number }).status;
  }
  return undefined;
}

function isRetryableNetwork(err: unknown): boolean {
  const name = err instanceof Error ? err.name : "";
  const message = err instanceof Error ? err.message : String(err);
  if (name === "AbortError" || /abort/i.test(message)) return false;
  if (err instanceof TypeError && message.includes("fetch")) return true;
  if (/network|ECONNREFUSED|ETIMEDOUT/i.test(message)) return true;
  return false;
}

function delayMs(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt), 10_000);
}

export type GenerateTextOptions = {
  prompt: string;
  model: string;
  timeoutMs?: number;
};

/**
 * Calls Gemini generateContent via @google/genai; returns the first candidate text.
 * Retries up to MAX_RETRIES on 429/5xx/network with exponential backoff.
 * Throws GeminiClientError on failure (message safe for API; no key leakage).
 */
export async function generateText(options: GenerateTextOptions): Promise<string> {
  const { prompt, model, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const requestId = crypto.randomUUID();
  const start = Date.now();

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const ai = getClient();
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          abortSignal: controller.signal,
        },
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - start;
      const text = (response.text ?? "").trim();
      log.info({ requestId, latencyMs }, "ok");
      return text;
    } catch (err) {
      clearTimeout(timeout);
      const latencyMs = Date.now() - start;
      const status = getStatusFromError(err);

      if (err instanceof Error && err.name === "AbortError") {
        log.warn({ requestId, latencyMs }, "timeout");
        throw new GeminiClientError("Gemini request timeout", "GEMINI_TIMEOUT");
      }

      if (status !== undefined && isRetryableStatus(status) && attempt < MAX_RETRIES) {
        const backoff = delayMs(attempt);
        log.warn(
          { requestId, status, attempt: attempt + 1, retryInMs: backoff, latencyMs },
          "retry"
        );
        await new Promise((r) => setTimeout(r, backoff));
        lastError = err instanceof Error ? err : new Error(String(err));
        continue;
      }

      if (isRetryableNetwork(err) && attempt < MAX_RETRIES) {
        const backoff = delayMs(attempt);
        log.warn(
          { requestId, attempt: attempt + 1, retryInMs: backoff, latencyMs },
          "network_error retry"
        );
        await new Promise((r) => setTimeout(r, backoff));
        lastError = err instanceof Error ? err : new Error(String(err));
        continue;
      }

      const message = err instanceof Error ? err.message : String(err);
      const safeMessage = message.length > 200 ? `${message.slice(0, 200)}...` : message;
      if (status !== undefined) {
        throw new GeminiClientError(`Gemini API error: ${status}`, "GEMINI_API_ERROR", status);
      }
      throw new GeminiClientError(safeMessage, "GEMINI_ERROR");
    }
  }

  throw lastError ?? new GeminiClientError("Gemini request failed after retries", "GEMINI_RETRY_FAILED");
}
