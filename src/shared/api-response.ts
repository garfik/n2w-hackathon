import { z } from 'zod';

export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiError<E = ApiErrorPayload> = {
  success: false;
  error: E;
};

export type ApiErrorPayload = {
  code?: string;
  message: string;
  issues?: string[];
  [key: string]: unknown;
};

export type ApiResponse<T, E = ApiErrorPayload> = ApiSuccess<T> | ApiError<E>;

export const ApiErrorPayloadSchema = z
  .object({
    code: z.string().optional(),
    message: z.string(),
    issues: z.array(z.string()).optional(),
  })
  .catchall(z.unknown());

export type ApiErrorPayloadDto = z.output<typeof ApiErrorPayloadSchema>;

// --- Generic Zod schemas (use with .merge or as base) ---

/** Success response: { success: true, data: T } */
export function apiSuccessSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
  });
}

/** Error response: { success: false, error: E } */
export function apiErrorSchema<E extends z.ZodTypeAny = typeof ApiErrorPayloadSchema>(
  errorSchema?: E
) {
  return z.object({
    success: z.literal(false),
    error: errorSchema ?? ApiErrorPayloadSchema,
  });
}

export function apiResponseSchema<
  T extends z.ZodTypeAny,
  E extends z.ZodTypeAny = typeof ApiErrorPayloadSchema,
>(dataSchema: T, errorSchema?: E) {
  return z.discriminatedUnion('success', [
    apiSuccessSchema(dataSchema),
    apiErrorSchema(errorSchema),
  ]);
}
