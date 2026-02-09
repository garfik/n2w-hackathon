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

/** Thrown when the daily Gemini token limit is exceeded. Use in routing to return 429. */
export class GeminiDailyLimitError extends GeminiClientError {
  constructor(message = 'Daily token limit reached. Try again tomorrow.') {
    super(message, 'GEMINI_DAILY_LIMIT', 429);
    this.name = 'GeminiDailyLimitError';
  }
}
