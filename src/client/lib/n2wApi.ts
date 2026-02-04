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
import { z } from 'zod';

const credentials: RequestCredentials = 'include';

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
  if (!res.ok) {
    const err = z.object({ error: z.string().optional() }).safeParse(raw);
    throw new Error(err.success ? (err.data.error ?? 'Create failed') : 'Create failed');
  }
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
  if (parsed.data.ok === false && res.ok) {
    return parsed.data;
  }
  if (parsed.data.ok === false) {
    return parsed.data;
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
  if (!res.ok) {
    const err = z.object({ error: z.string().optional() }).safeParse(raw);
    throw new Error(err.success ? (err.data.error ?? 'Update failed') : 'Update failed');
  }
  const parsed = UpdateAvatarResponseDtoSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('Invalid update avatar response');
  }
  return parsed.data;
}

export async function listAvatars(): Promise<Avatar[]> {
  const res = await fetch('/api/avatars', { credentials });
  const raw = await res.json();
  if (!res.ok) {
    const err = z.object({ error: z.string().optional() }).safeParse(raw);
    throw new Error(
      err.success ? (err.data.error ?? 'Failed to load avatars') : 'Failed to load avatars'
    );
  }
  const parsed = ListAvatarsResponseDtoSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('Invalid list avatars response');
  }
  return parsed.data.avatars;
}

export async function getAvatar(avatarId: string): Promise<Avatar> {
  const res = await fetch(`/api/avatars/${encodeURIComponent(avatarId)}`, { credentials });
  const raw = await res.json();
  if (!res.ok) {
    const err = z.object({ error: z.string().optional() }).safeParse(raw);
    throw new Error(err.success ? (err.data.error ?? 'Avatar not found') : 'Avatar not found');
  }
  const parsed = GetAvatarResponseDtoSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('Invalid get avatar response');
  }
  return parsed.data.avatar;
}

export async function deleteAvatar(avatarId: string): Promise<{ deletedOutfitsCount: number }> {
  const res = await fetch(`/api/avatars/${encodeURIComponent(avatarId)}`, {
    method: 'DELETE',
    credentials,
  });
  const raw = await res.json();
  if (!res.ok) {
    const err = z.object({ error: z.string().optional() }).safeParse(raw);
    throw new Error(err.success ? (err.data.error ?? 'Delete failed') : 'Delete failed');
  }
  const parsed = DeleteAvatarResponseDtoSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('Invalid delete avatar response');
  }
  return { deletedOutfitsCount: parsed.data.deletedOutfitsCount };
}
