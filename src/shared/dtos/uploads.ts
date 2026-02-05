import { z } from 'zod';
import { apiSuccessSchema } from '@shared/api-response';

// --- POST /api/uploads ---

export const UploadResultSchema = z.object({
  id: z.string(),
  url: z.string(),
  width: z.number(),
  height: z.number(),
  mimeType: z.string(),
});

export type UploadResult = z.output<typeof UploadResultSchema>;

export const UploadResponseDtoSchema = apiSuccessSchema(UploadResultSchema);
export type UploadResponseDto = z.output<typeof UploadResponseDtoSchema>;
