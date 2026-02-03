import { z } from 'zod';
import {
  AvatarBodyProfileSchema,
  AvatarAnalysisErrorSchema,
  type AvatarBodyProfile,
} from '@shared/ai-schemas/avatar';

// --- Avatar entity (as returned by API) ---

export const AvatarDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  sourcePhotoKey: z.string().nullable(),
  bodyProfileJson: z.unknown().nullable(),
  heightCm: z.number().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type AvatarDto = z.output<typeof AvatarDtoSchema>;

// --- Response DTOs ---

export const ListAvatarsResponseDtoSchema = z.object({
  ok: z.literal(true),
  avatars: z.array(AvatarDtoSchema),
});

export type ListAvatarsResponseDto = z.output<typeof ListAvatarsResponseDtoSchema>;

export const GetAvatarResponseDtoSchema = z.object({
  ok: z.literal(true),
  avatar: AvatarDtoSchema,
});

export type GetAvatarResponseDto = z.output<typeof GetAvatarResponseDtoSchema>;

export const CreateAvatarResponseDtoSchema = z.object({
  ok: z.literal(true),
  id: z.string(),
});

export type CreateAvatarResponseDto = z.output<typeof CreateAvatarResponseDtoSchema>;

export const UpdateAvatarResponseDtoSchema = z.object({
  ok: z.literal(true),
  avatar: AvatarDtoSchema,
});

export type UpdateAvatarResponseDto = z.output<typeof UpdateAvatarResponseDtoSchema>;

export const DeleteAvatarResponseDtoSchema = z.object({
  ok: z.literal(true),
  deletedOutfitsCount: z.number(),
});

export type DeleteAvatarResponseDto = z.output<typeof DeleteAvatarResponseDtoSchema>;

// --- Analyze: success/error (API response shape) ---

export const AnalyzeAvatarSuccessDtoSchema = z.object({
  ok: z.literal(true),
  data: AvatarBodyProfileSchema,
});

export const AnalyzeAvatarErrorDtoSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    code: AvatarAnalysisErrorSchema.shape.code,
    message: z.string(),
    issues: z.array(z.string()),
  }),
});

export const AnalyzeAvatarResponseDtoSchema = z.discriminatedUnion('ok', [
  AnalyzeAvatarSuccessDtoSchema,
  AnalyzeAvatarErrorDtoSchema,
]);

export type AnalyzeAvatarSuccessDto = z.output<typeof AnalyzeAvatarSuccessDtoSchema>;
export type AnalyzeAvatarErrorDto = z.output<typeof AnalyzeAvatarErrorDtoSchema>;
export type AnalyzeAvatarResponseDto = z.output<typeof AnalyzeAvatarResponseDtoSchema>;

// --- Request (client → server) ---

export type CreateAvatarParams = { file: File; name: string };

export const UpdateAvatarBodySchema = z.object({
  name: z.string().min(1).optional(),
  bodyProfileJson: AvatarBodyProfileSchema.optional(),
  heightCm: z.number().min(0).optional(),
});

export type UpdateAvatarBody = z.input<typeof UpdateAvatarBodySchema>;

// Re-export for consumers that need the body profile type (e.g. PATCH body)
export type { AvatarBodyProfile };
