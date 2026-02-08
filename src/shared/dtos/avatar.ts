import { z } from 'zod';
import {
  AvatarBodyProfileSchema,
  AvatarAnalysisErrorSchema,
  type AvatarBodyProfile,
} from '@shared/ai-schemas/avatar';
import { apiSuccessSchema, apiErrorSchema, apiResponseSchema } from '@shared/api-response';

// --- Clean body profile schema (for storage and editing, without AI metadata) ---

/**
 * AvatarBodyProfileCleanSchema
 *
 * Same fields as AvatarBodyProfileSchema but without:
 * - confidence (AI metadata, not user-editable)
 * - issues (AI warnings, not stored after user edits)
 *
 * This is what gets stored in the avatar table and what users can edit.
 */
export const AvatarBodyProfileCleanSchema = AvatarBodyProfileSchema.omit({
  confidence: true,
  issues: true,
});

export type AvatarBodyProfileClean = z.output<typeof AvatarBodyProfileCleanSchema>;

// --- Avatar entity (as returned by API) ---

export const AvatarDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  photoUploadId: z.string().nullable(),
  bodyProfileJson: z.unknown().nullable(),
  heightCm: z.number().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type AvatarDto = z.output<typeof AvatarDtoSchema>;

// --- Response DTOs (unified success/data | success/error pattern) ---

export const ListAvatarsResponseDtoSchema = apiSuccessSchema(
  z.object({ avatars: z.array(AvatarDtoSchema) })
);
export type ListAvatarsResponseDto = z.output<typeof ListAvatarsResponseDtoSchema>;

export const GetAvatarResponseDtoSchema = apiSuccessSchema(z.object({ avatar: AvatarDtoSchema }));
export type GetAvatarResponseDto = z.output<typeof GetAvatarResponseDtoSchema>;

export const CreateAvatarResponseDtoSchema = apiSuccessSchema(z.object({ id: z.string() }));
export type CreateAvatarResponseDto = z.output<typeof CreateAvatarResponseDtoSchema>;

// --- Generate avatar image (body + face → one composite photo) ---
export const GenerateAvatarImageBodySchema = z.object({
  bodyPhotoUploadId: z.string().uuid(),
  facePhotoUploadId: z.string().uuid(),
});
export type GenerateAvatarImageBody = z.output<typeof GenerateAvatarImageBodySchema>;

export const GenerateAvatarImageResponseDtoSchema = apiSuccessSchema(
  z.object({ uploadId: z.string().uuid() })
);
export type GenerateAvatarImageResponseDto = z.output<typeof GenerateAvatarImageResponseDtoSchema>;

export const UpdateAvatarResponseDtoSchema = apiSuccessSchema(
  z.object({ avatar: AvatarDtoSchema })
);
export type UpdateAvatarResponseDto = z.output<typeof UpdateAvatarResponseDtoSchema>;

export const DeleteAvatarResponseDtoSchema = apiSuccessSchema(
  z.object({ deletedOutfitsCount: z.number() })
);
export type DeleteAvatarResponseDto = z.output<typeof DeleteAvatarResponseDtoSchema>;

// --- Analyze: success/data | success/error ---

const AnalyzeAvatarErrorPayloadSchema = z.object({
  code: AvatarAnalysisErrorSchema.shape.code,
  message: z.string(),
  issues: z.array(z.string()),
});

export const AnalyzeAvatarSuccessDtoSchema = apiSuccessSchema(AvatarBodyProfileSchema);
export const AnalyzeAvatarErrorDtoSchema = apiErrorSchema(AnalyzeAvatarErrorPayloadSchema);

export const AnalyzeAvatarResponseDtoSchema = apiResponseSchema(
  AvatarBodyProfileSchema,
  AnalyzeAvatarErrorPayloadSchema
);

export type AnalyzeAvatarSuccessDto = z.output<typeof AnalyzeAvatarSuccessDtoSchema>;
export type AnalyzeAvatarErrorDto = z.output<typeof AnalyzeAvatarErrorDtoSchema>;
export type AnalyzeAvatarResponseDto = z.output<typeof AnalyzeAvatarResponseDtoSchema>;

// --- Request (client → server) ---

export const CreateAvatarBodySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  uploadId: z.string().min(1).optional(),
  heightCm: z.number().min(0).optional(),
});

export type CreateAvatarBody = z.input<typeof CreateAvatarBodySchema>;

/** Client params for createAvatar (uploadId required; heightCm optional). */
export type CreateAvatarParams = CreateAvatarBody;

export const UpdateAvatarBodySchema = z.object({
  name: z.string().min(1).optional(),
  bodyProfileJson: AvatarBodyProfileCleanSchema.optional(),
  heightCm: z.number().min(0).optional(),
});

export type UpdateAvatarBody = z.input<typeof UpdateAvatarBodySchema>;

// Re-export AvatarBodyProfile from ai-schemas for consumers
// (AvatarBodyProfileClean is already exported above)
export type { AvatarBodyProfile };
