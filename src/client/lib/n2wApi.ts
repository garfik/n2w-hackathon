import {
  AppBootstrapResponseDtoSchema,
  MeResponseDtoSchema,
  UploadResponseDtoSchema,
  type UploadResult,
} from '@shared/dtos';
import {
  ListAvatarsResponseDtoSchema,
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
import { apiErrorSchema } from '@shared/api-response';

const credentials: RequestCredentials = 'include';

const ApiErrorResponseSchema = apiErrorSchema();

function parseErrorResponse(raw: unknown, fallbackMessage: string): never {
  const parsed = ApiErrorResponseSchema.safeParse(raw);
  const message = parsed.success ? parsed.data.error.message : fallbackMessage;
  throw new Error(message || fallbackMessage);
}

// --- App bootstrap & auth (for loaders) ---

export type { UploadResult };

/** GET /api/app/bootstrap. Returns data or { status: 401 } for redirect. */
export async function getAppBootstrap(): Promise<{ avatarExists: boolean } | { status: 401 }> {
  const res = await fetch('/api/app/bootstrap', { credentials });
  if (res.status === 401) return { status: 401 };
  const raw = await res.json();
  if (!res.ok) parseErrorResponse(raw, 'Bootstrap failed');
  const parsed = AppBootstrapResponseDtoSchema.safeParse(raw);
  if (!parsed.success) throw new Response('Invalid bootstrap response', { status: 502 });
  return { avatarExists: parsed.data.data.avatarExists };
}

/** GET /api/me. Throws on non-2xx (e.g. 401). */
export async function getMe(): Promise<{ userId: string; email: string }> {
  const res = await fetch('/api/me', { credentials });
  const raw = await res.json();
  if (!res.ok) parseErrorResponse(raw, 'Unauthorized');
  const parsed = MeResponseDtoSchema.safeParse(raw);
  if (!parsed.success) throw new Error('Invalid me response');
  return parsed.data.data;
}

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

// Re-export for consumers
export type Avatar = AvatarDto;
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

export async function listAvatars(): Promise<Avatar[]> {
  const res = await fetch('/api/avatars', { credentials });
  const raw = await res.json();
  if (!res.ok) parseErrorResponse(raw, 'Failed to load avatars');
  const parsed = ListAvatarsResponseDtoSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('Invalid list avatars response');
  }
  return parsed.data.data.avatars;
}

export async function getAvatar(avatarId: string): Promise<Avatar> {
  const res = await fetch(`/api/avatars/${encodeURIComponent(avatarId)}`, { credentials });
  const raw = await res.json();
  if (!res.ok) parseErrorResponse(raw, 'Avatar not found');
  const parsed = GetAvatarResponseDtoSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('Invalid get avatar response');
  }
  return parsed.data.data.avatar;
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

// --- Outfits (minimal types, no shared DTO yet) ---

export type OutfitListItem = { id: string; avatarId: string; occasion: string; createdAt: string };

export type OutfitDetailGarment = { id: string; name: string; thumbnailUrl: string | null };
export type OutfitDetail = {
  id: string;
  occasion: string;
  resultImageUrl: string | null;
  scoreJson: unknown;
  garments: OutfitDetailGarment[];
};

export async function listOutfits(avatarId: string): Promise<OutfitListItem[]> {
  const url = new URL('/api/outfits', window.location.origin);
  url.searchParams.set('avatarId', avatarId);
  const res = await fetch(url.toString(), { credentials });
  const raw = await res.json();
  if (!res.ok) parseErrorResponse(raw, 'Failed to load outfits');
  const data = raw as { success?: boolean; data?: { outfits?: OutfitListItem[] } };
  if (!data.data?.outfits) return [];
  return data.data.outfits;
}

export async function getOutfit(outfitId: string): Promise<OutfitDetail> {
  const res = await fetch(`/api/outfits/${encodeURIComponent(outfitId)}`, { credentials });
  const raw = await res.json();
  if (!res.ok) {
    if (res.status === 404) throw new Error('Outfit not found');
    parseErrorResponse(raw, 'Failed to load outfit');
  }
  const data = raw as { success?: boolean; data?: { outfit?: OutfitDetail } };
  if (!data.data?.outfit) throw new Error('Invalid outfit response');
  return data.data.outfit;
}
