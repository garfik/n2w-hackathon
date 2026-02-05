import type { ApiSuccess, ApiError, ApiErrorPayload } from '@shared/api-response';

/** Build JSON response for success. */
export function apiOk<T>(data: T, status = 200): Response {
  return Response.json({ success: true, data } satisfies ApiSuccess<T>, { status });
}

/** Build JSON response for error. */
export function apiErr<E = ApiErrorPayload>(error: E, status = 400): Response {
  return Response.json({ success: false, error } satisfies ApiError<E>, { status });
}
