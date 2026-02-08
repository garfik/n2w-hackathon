import { UploadResponseDtoSchema, type UploadResult } from '@shared/dtos';
import {
  GetAvatarResponseDtoSchema,
  CreateAvatarResponseDtoSchema,
  UpdateAvatarResponseDtoSchema,
  DeleteAvatarResponseDtoSchema,
  AnalyzeAvatarResponseDtoSchema,
  type AvatarDto,
  type CreateAvatarParams,
  type UpdateAvatarBody,
  type CreateAvatarResponseDto,
  type UpdateAvatarResponseDto,
  type AnalyzeAvatarSuccessDto,
  type AnalyzeAvatarErrorDto,
  type AnalyzeAvatarResponseDto,
} from '@shared/dtos/avatar';
import {
  ListGarmentsResponseDtoSchema,
  GetGarmentResponseDtoSchema,
  DetectGarmentsResponseDtoSchema,
  CreateGarmentsResponseDtoSchema,
  UpdateGarmentResponseDtoSchema,
  DeleteGarmentResponseDtoSchema,
  type GarmentListItem,
  type GarmentDetail,
  type DetectionItem,
  type CreateGarmentsBody,
  type UpdateGarmentBody,
} from '@shared/dtos/garment';
import {
  CreateOutfitResponseDtoSchema,
  ListOutfitsResponseDtoSchema,
  GetOutfitResponseDtoSchema,
  ScoreOutfitResponseDtoSchema,
  TryonOutfitResponseDtoSchema,
  type OutfitListItemDto,
  type OutfitDetailDto,
  type OutfitGarmentDto,
  type TryonDto,
  type ScoreResultDto,
  type CreateOutfitResponseDto,
} from '@shared/dtos/outfit';
import { apiErrorSchema } from '@shared/api-response';

const credentials: RequestCredentials = 'include';

const ApiErrorResponseSchema = apiErrorSchema();

function parseErrorResponse(raw: unknown, fallbackMessage: string): never {
  const parsed = ApiErrorResponseSchema.safeParse(raw);
  const message = parsed.success ? parsed.data.error.message : fallbackMessage;
  throw new Error(message || fallbackMessage);
}

export type { UploadResult };

/** POST /api/uploads with FormData (file). Returns upload result. */
export async function uploadFile(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/uploads', {
    method: 'POST',
    credentials,
    body: formData,
  });
  const raw = await res.json();
  if (!res.ok) parseErrorResponse(raw, `Upload failed (${res.status})`);
  const parsed = UploadResponseDtoSchema.safeParse(raw);
  if (!parsed.success) throw new Error('Invalid upload response');
  return parsed.data.data;
}

// --- Avatars ---

export type Avatar = AvatarDto & { outfitsCount?: number };
export type { CreateAvatarParams };
export type CreateAvatarResponse = CreateAvatarResponseDto;
export type UpdateAvatarParams = {
  avatarId: string;
  name?: string;
  bodyProfileJson?: UpdateAvatarBody['bodyProfileJson'];
  heightCm?: number;
};
export type UpdateAvatarResponse = UpdateAvatarResponseDto;
export type AnalyzeSuccessResponse = AnalyzeAvatarSuccessDto;
export type AnalyzeErrorResponse = AnalyzeAvatarErrorDto;
export type AnalyzeResponse = AnalyzeAvatarResponseDto;

export type AnalyzeAvatarParams = { avatarId: string };

export async function createAvatar(params: CreateAvatarParams): Promise<CreateAvatarResponseDto> {
  const res = await fetch('/api/avatars', {
    method: 'POST',
    credentials,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: params.name,
      uploadId: params.uploadId,
      ...(params.heightCm != null && { heightCm: params.heightCm }),
    }),
  });
  const raw = await res.json();
  if (!res.ok) parseErrorResponse(raw, 'Create failed');
  const parsed = CreateAvatarResponseDtoSchema.safeParse(raw);
  if (!parsed.success) throw new Error('Invalid create avatar response');
  return parsed.data;
}

export async function analyzeAvatar({
  avatarId,
}: AnalyzeAvatarParams): Promise<AnalyzeAvatarResponseDto> {
  const res = await fetch(`/api/avatars/${encodeURIComponent(avatarId)}/analyze`, {
    method: 'POST',
    credentials,
  });
  const raw = await res.json();
  const parsed = AnalyzeAvatarResponseDtoSchema.safeParse(raw);
  if (!parsed.success) {
    if (res.status === 409) {
      throw new Error('Avatar already analyzed');
    }
    if (res.status === 404) {
      throw new Error('Avatar not found');
    }
    throw new Error('Invalid analyze response');
  }
  return parsed.data;
}

export async function updateAvatar({
  avatarId,
  name,
  bodyProfileJson,
  heightCm,
}: UpdateAvatarParams): Promise<UpdateAvatarResponseDto> {
  const body: UpdateAvatarBody = {};
  if (name !== undefined) body.name = name;
  if (bodyProfileJson !== undefined) body.bodyProfileJson = bodyProfileJson;
  if (heightCm !== undefined) body.heightCm = heightCm;

  const res = await fetch(`/api/avatars/${encodeURIComponent(avatarId)}`, {
    method: 'PATCH',
    credentials,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const raw = await res.json();
  if (!res.ok) parseErrorResponse(raw, 'Update failed');
  const parsed = UpdateAvatarResponseDtoSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('Invalid update avatar response');
  }
  return parsed.data;
}

export async function getAvatar(avatarId: string): Promise<Avatar> {
  const res = await fetch(`/api/avatars/${encodeURIComponent(avatarId)}`, { credentials });
  const raw = await res.json();
  if (!res.ok) parseErrorResponse(raw, 'Avatar not found');
  const parsed = GetAvatarResponseDtoSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('Invalid get avatar response');
  }
  const { avatar: a, outfitsCount } = parsed.data.data;
  return { ...a, outfitsCount };
}

export async function deleteAvatar(avatarId: string): Promise<{ deletedOutfitsCount: number }> {
  const res = await fetch(`/api/avatars/${encodeURIComponent(avatarId)}`, {
    method: 'DELETE',
    credentials,
  });
  const raw = await res.json();
  if (!res.ok) parseErrorResponse(raw, 'Delete failed');
  const parsed = DeleteAvatarResponseDtoSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('Invalid delete avatar response');
  }
  return parsed.data.data;
}

// --- Outfits ---

export type OutfitListItem = OutfitListItemDto;
export type OutfitDetailGarment = OutfitGarmentDto;
export type OutfitDetail = OutfitDetailDto;
export type ScoreResult = ScoreResultDto;
export type TryonResult = TryonDto;

export type CreateOutfitParams = {
  avatarId: string;
  garmentIds: string[];
  occasion: string;
};

export type CreateOutfitResult = CreateOutfitResponseDto['data'];

export async function createOutfit(params: CreateOutfitParams): Promise<CreateOutfitResult> {
  const res = await fetch(`/api/avatars/${encodeURIComponent(params.avatarId)}/outfits`, {
    method: 'POST',
    credentials,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      garmentIds: params.garmentIds,
      occasion: params.occasion,
    }),
  });
  const raw = await res.json();
  if (!res.ok) parseErrorResponse(raw, 'Create outfit failed');
  const parsed = CreateOutfitResponseDtoSchema.safeParse(raw);
  if (!parsed.success) throw new Error('Invalid create outfit response');
  return parsed.data.data;
}

export async function listOutfits(avatarId: string): Promise<OutfitListItem[]> {
  const res = await fetch(`/api/avatars/${encodeURIComponent(avatarId)}/outfits`, { credentials });
  const raw = await res.json();
  if (!res.ok) parseErrorResponse(raw, 'Failed to load outfits');
  const parsed = ListOutfitsResponseDtoSchema.safeParse(raw);
  if (!parsed.success) throw new Error('Invalid list outfits response');
  return parsed.data.data.outfits;
}

export async function getOutfit(outfitId: string): Promise<OutfitDetail> {
  const res = await fetch(`/api/outfits/${encodeURIComponent(outfitId)}`, { credentials });
  const raw = await res.json();
  if (!res.ok) {
    if (res.status === 404) throw new Error('Outfit not found');
    parseErrorResponse(raw, 'Failed to load outfit');
  }
  const parsed = GetOutfitResponseDtoSchema.safeParse(raw);
  if (!parsed.success) throw new Error('Invalid outfit response');
  return parsed.data.data.outfit;
}

export async function generateScore(outfitId: string): Promise<ScoreResult> {
  const res = await fetch(`/api/outfits/${encodeURIComponent(outfitId)}/score`, {
    method: 'POST',
    credentials,
  });
  const raw = await res.json();
  if (!res.ok) parseErrorResponse(raw, 'Score generation failed');
  const parsed = ScoreOutfitResponseDtoSchema.safeParse(raw);
  if (!parsed.success) throw new Error('Invalid score response');
  return parsed.data.data;
}

export async function generateTryon(outfitId: string): Promise<TryonResult> {
  const res = await fetch(`/api/outfits/${encodeURIComponent(outfitId)}/tryon`, {
    method: 'POST',
    credentials,
  });
  const raw = await res.json();
  if (!res.ok) parseErrorResponse(raw, 'Tryon generation failed');
  const parsed = TryonOutfitResponseDtoSchema.safeParse(raw);
  if (!parsed.success) throw new Error('Invalid tryon response');
  return parsed.data.data;
}

// --- Garments ---

export type { GarmentListItem, GarmentDetail, DetectionItem };

export type ListGarmentsParams = { category?: string; search?: string };

export async function listGarments(params?: ListGarmentsParams): Promise<GarmentListItem[]> {
  const url = new URL('/api/garments', window.location.origin);
  if (params?.category) url.searchParams.set('category', params.category);
  if (params?.search) url.searchParams.set('search', params.search);
  const res = await fetch(url.toString(), { credentials });
  const raw = await res.json();
  if (!res.ok) parseErrorResponse(raw, 'Failed to load garments');
  const parsed = ListGarmentsResponseDtoSchema.safeParse(raw);
  if (!parsed.success) throw new Error('Invalid list garments response');
  return parsed.data.data.garments;
}

export type DetectGarmentsResult = {
  uploadId: string;
  imageUrl: string;
  detections: DetectionItem[];
};

export async function detectGarments(uploadId: string): Promise<DetectGarmentsResult> {
  const res = await fetch('/api/garments/detect', {
    method: 'POST',
    credentials,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uploadId }),
  });
  const raw = await res.json();
  if (!res.ok) parseErrorResponse(raw, 'Detect failed');
  const parsed = DetectGarmentsResponseDtoSchema.safeParse(raw);
  if (!parsed.success) throw new Error('Invalid detect response');
  return parsed.data.data;
}

export async function getGarment(garmentId: string): Promise<GarmentDetail> {
  const res = await fetch(`/api/garments/${encodeURIComponent(garmentId)}`, { credentials });
  const raw = await res.json();
  if (!res.ok) parseErrorResponse(raw, 'Garment not found');
  const parsed = GetGarmentResponseDtoSchema.safeParse(raw);
  if (!parsed.success) throw new Error('Invalid get garment response');
  return parsed.data.data.garment;
}

export async function createGarmentsFromDetections(
  body: CreateGarmentsBody
): Promise<{ createdIds: string[] }> {
  const res = await fetch('/api/garments', {
    method: 'POST',
    credentials,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const raw = await res.json();
  if (!res.ok) parseErrorResponse(raw, 'Create garments failed');
  const parsed = CreateGarmentsResponseDtoSchema.safeParse(raw);
  if (!parsed.success) throw new Error('Invalid create garments response');
  return parsed.data.data;
}

export type UpdateGarmentParams = {
  garmentId: string;
  name?: string;
  category?: string;
  garmentProfileJson?: unknown;
};

export async function updateGarment({
  garmentId,
  ...body
}: UpdateGarmentParams): Promise<GarmentDetail> {
  const payload: UpdateGarmentBody = {};
  if (body.name !== undefined) payload.name = body.name;
  if (body.category !== undefined) payload.category = body.category;
  if (body.garmentProfileJson !== undefined) payload.garmentProfileJson = body.garmentProfileJson;

  const res = await fetch(`/api/garments/${encodeURIComponent(garmentId)}`, {
    method: 'PATCH',
    credentials,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const raw = await res.json();
  if (!res.ok) parseErrorResponse(raw, 'Update failed');
  const parsed = UpdateGarmentResponseDtoSchema.safeParse(raw);
  if (!parsed.success) throw new Error('Invalid update garment response');
  return parsed.data.data.garment;
}

export async function deleteGarment(garmentId: string): Promise<{ deleted: boolean }> {
  const res = await fetch(`/api/garments/${encodeURIComponent(garmentId)}`, {
    method: 'DELETE',
    credentials,
  });
  const raw = await res.json();
  if (!res.ok) parseErrorResponse(raw, 'Delete failed');
  const parsed = DeleteGarmentResponseDtoSchema.safeParse(raw);
  if (!parsed.success) throw new Error('Invalid delete garment response');
  return parsed.data.data;
}
