import { z } from 'zod';
import { apiSuccessSchema } from '@shared/api-response';

// --- GET /api/app/bootstrap ---

export const AppBootstrapResponseDtoSchema = apiSuccessSchema(
  z.object({ avatarExists: z.boolean() })
);
export type AppBootstrapResponseDto = z.output<typeof AppBootstrapResponseDtoSchema>;

// --- GET /api/me ---

export const MeResponseDtoSchema = apiSuccessSchema(
  z.object({
    userId: z.string(),
    email: z.string(),
  })
);
export type MeResponseDto = z.output<typeof MeResponseDtoSchema>;
