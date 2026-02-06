import { z } from 'zod';
import { apiSuccessSchema } from '@shared/api-response';

const BboxNormSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});

// --- Garment list item (GET /api/garments) ---

export const GarmentListItemSchema = z.object({
  id: z.string(),
  uploadId: z.string(),
  imageUrl: z.string(),
  name: z.string().nullable(),
  category: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type GarmentListItem = z.output<typeof GarmentListItemSchema>;

export const ListGarmentsResponseDtoSchema = apiSuccessSchema(
  z.object({ garments: z.array(GarmentListItemSchema) })
);
export type ListGarmentsResponseDto = z.output<typeof ListGarmentsResponseDtoSchema>;

// --- Detect (POST /api/garments/detect) ---

export const DetectGarmentsBodySchema = z.object({ uploadId: z.string() });
export type DetectGarmentsBody = z.output<typeof DetectGarmentsBodySchema>;

export const DetectionItemSchema = z.object({
  id: z.string(),
  bbox: BboxNormSchema,
  categoryGuess: z.string().nullable(),
  labelGuess: z.string().nullable(),
  confidence: z.number().nullable(),
  garmentProfile: z.unknown().nullable(),
});

export type DetectionItem = z.output<typeof DetectionItemSchema>;

export const DetectGarmentsResponseDtoSchema = apiSuccessSchema(
  z.object({
    uploadId: z.string(),
    imageUrl: z.string(),
    detections: z.array(DetectionItemSchema),
  })
);
export type DetectGarmentsResponseDto = z.output<typeof DetectGarmentsResponseDtoSchema>;

// --- Create from detections (POST /api/garments) ---

export const CreateGarmentsBodySchema = z.object({
  detectionIds: z.array(z.string()),
  overrides: z
    .record(
      z.string(),
      z.object({
        name: z.string().optional(),
        category: z.string().optional(),
      })
    )
    .optional(),
});
export type CreateGarmentsBody = z.output<typeof CreateGarmentsBodySchema>;

export const CreateGarmentsResponseDtoSchema = apiSuccessSchema(
  z.object({ createdIds: z.array(z.string()) })
);
export type CreateGarmentsResponseDto = z.output<typeof CreateGarmentsResponseDtoSchema>;

// --- PATCH /api/garments/:id ---

export const UpdateGarmentBodySchema = z.object({
  name: z.string().optional(),
  category: z.string().optional(),
  garmentProfileJson: z.unknown().optional(),
});
export type UpdateGarmentBody = z.output<typeof UpdateGarmentBodySchema>;

export const UpdateGarmentResponseDtoSchema = apiSuccessSchema(
  z.object({ garment: GarmentListItemSchema })
);
export type UpdateGarmentResponseDto = z.output<typeof UpdateGarmentResponseDtoSchema>;
