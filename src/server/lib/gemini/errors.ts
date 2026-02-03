/**
 * Gemini API errors with codes for API responses.
 */

export class GeminiClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'GeminiClientError';
  }
}

export class GeminiParseError extends Error {
  constructor(
    message: string,
    public readonly code = 'GEMINI_PARSE_ERROR'
  ) {
    super(message);
    this.name = 'GeminiParseError';
  }
}
