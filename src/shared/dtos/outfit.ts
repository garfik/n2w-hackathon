import { z } from 'zod';
import { apiSuccessSchema } from '@shared/api-response';
import { OutfitScoreSchema } from '@shared/ai-schemas/score';

export const GenerationStatusSchema = z.enum(['pending', 'running', 'succeeded', 'failed']);
export type GenerationStatus = z.output<typeof GenerationStatusSchema>;

export const CreateOutfitBodySchema = z.object({
  garmentIds: z.array(z.string().min(1)).min(1, 'At least one garment is required'),
  occasion: z.string().min(1, 'Occasion is required'),
});
export type CreateOutfitBody = z.input<typeof CreateOutfitBodySchema>;

const TryonDtoSchema = z.object({
  id: z.string(),
  status: GenerationStatusSchema,
  imageUrl: z.string().nullable(),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
});
export type TryonDto = z.output<typeof TryonDtoSchema>;

const OutfitGarmentDtoSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  category: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
});
export type OutfitGarmentDto = z.output<typeof OutfitGarmentDtoSchema>;

export const CreateOutfitResponseDtoSchema = apiSuccessSchema(
  z.object({
    outfitId: z.string(),
    cached: z.boolean(),
  })
);
export type CreateOutfitResponseDto = z.output<typeof CreateOutfitResponseDtoSchema>;

export const OutfitListItemDtoSchema = z.object({
  id: z.string(),
  occasion: z.string(),
  status: GenerationStatusSchema,
  overall: z.number().nullable(),
  verdict: z.string().nullable(),
  tryonId: z.string().nullable(),
  tryonStatus: GenerationStatusSchema.nullable(),
  tryonImageUrl: z.string().nullable(),
  createdAt: z.coerce.date(),
});
export type OutfitListItemDto = z.output<typeof OutfitListItemDtoSchema>;

export const ListOutfitsResponseDtoSchema = apiSuccessSchema(
  z.object({ outfits: z.array(OutfitListItemDtoSchema) })
);
export type ListOutfitsResponseDto = z.output<typeof ListOutfitsResponseDtoSchema>;

export const OutfitDetailDtoSchema = z.object({
  id: z.string(),
  avatarId: z.string(),
  occasion: z.string(),
  status: GenerationStatusSchema,
  scoreJson: OutfitScoreSchema.nullable(),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  garments: z.array(OutfitGarmentDtoSchema),
  tryon: TryonDtoSchema.nullable(),
  createdAt: z.coerce.date(),
});
export type OutfitDetailDto = z.output<typeof OutfitDetailDtoSchema>;

export const GetOutfitResponseDtoSchema = apiSuccessSchema(
  z.object({ outfit: OutfitDetailDtoSchema })
);
export type GetOutfitResponseDto = z.output<typeof GetOutfitResponseDtoSchema>;

export const ScoreResultDtoSchema = z.object({
  status: GenerationStatusSchema,
  score: OutfitScoreSchema.nullable(),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
});
export type ScoreResultDto = z.output<typeof ScoreResultDtoSchema>;

export const ScoreOutfitResponseDtoSchema = apiSuccessSchema(ScoreResultDtoSchema);
export type ScoreOutfitResponseDto = z.output<typeof ScoreOutfitResponseDtoSchema>;

export const TryonOutfitResponseDtoSchema = apiSuccessSchema(TryonDtoSchema);
export type TryonOutfitResponseDto = z.output<typeof TryonOutfitResponseDtoSchema>;
