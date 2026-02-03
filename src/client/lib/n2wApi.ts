import {
  AvatarBodyProfileSchema,
  AvatarAnalysisErrorSchema,
  type AvatarBodyProfile,
} from '@shared/schemas/avatar';
import { z } from 'zod';

const credentials: RequestCredentials = 'include';

// Avatar schema for list/get responses
const AvatarSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  sourcePhotoKey: z.string().nullable(),
  bodyProfileJson: z.unknown().nullable(),
  heightCm: z.number().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Avatar = z.output<typeof AvatarSchema>;

const ListAvatarsResponseSchema = z.object({
  ok: z.literal(true),
  avatars: z.array(AvatarSchema),
});

const GetAvatarResponseSchema = z.object({
  ok: z.literal(true),
  avatar: AvatarSchema,
});

const DeleteAvatarResponseSchema = z.object({
  ok: z.literal(true),
  deletedOutfitsCount: z.number(),
});

const CreateAvatarResponseSchema = z.object({
  ok: z.literal(true),
  id: z.string(),
});
type CreateAvatarResponse = z.output<typeof CreateAvatarResponseSchema>;

const AnalyzeSuccessResponseSchema = z.object({
  ok: z.literal(true),
  data: AvatarBodyProfileSchema,
});
const AnalyzeErrorResponseSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    code: AvatarAnalysisErrorSchema.shape.code,
    message: z.string(),
    issues: z.array(z.string()),
  }),
});
const AnalyzeResponseSchema = z.discriminatedUnion('ok', [
  AnalyzeSuccessResponseSchema,
  AnalyzeErrorResponseSchema,
]);
export type AnalyzeSuccessResponse = z.output<typeof AnalyzeSuccessResponseSchema>;
export type AnalyzeErrorResponse = z.output<typeof AnalyzeErrorResponseSchema>;
export type AnalyzeResponse = z.output<typeof AnalyzeResponseSchema>;

const UpdateAvatarResponseSchema = z.object({
  ok: z.literal(true),
  avatar: z.object({
    id: z.string(),
    userId: z.string(),
    name: z.string(),
    sourcePhotoKey: z.string().nullable(),
    bodyProfileJson: z.unknown().nullable(),
    heightCm: z.number().nullable(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  }),
});
type UpdateAvatarResponse = z.output<typeof UpdateAvatarResponseSchema>;

export type CreateAvatarParams = { file: File; name: string };
export type AnalyzeAvatarParams = { avatarId: string };
export type UpdateAvatarParams = {
  avatarId: string;
  name?: string;
  bodyProfileJson?: AvatarBodyProfile;
  heightCm?: number;
};

export async function createAvatar({
  file,
  name,
}: CreateAvatarParams): Promise<CreateAvatarResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', name);
  const res = await fetch('/api/avatars', {
    method: 'POST',
    credentials,
    body: formData,
  });
  const raw = await res.json();
  if (!res.ok) {
    const err = z.object({ error: z.string().optional() }).safeParse(raw);
    throw new Error(err.success ? (err.data.error ?? 'Upload failed') : 'Upload failed');
  }
  const parsed = CreateAvatarResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('Invalid create avatar response');
  }
  return parsed.data;
}

export async function analyzeAvatar({ avatarId }: AnalyzeAvatarParams): Promise<AnalyzeResponse> {
  const res = await fetch(`/api/avatars/${encodeURIComponent(avatarId)}/analyze`, {
    method: 'POST',
    credentials,
  });
  const raw = await res.json();
  const parsed = AnalyzeResponseSchema.safeParse(raw);
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
}: UpdateAvatarParams): Promise<UpdateAvatarResponse> {
  const body: { name?: string; bodyProfileJson?: AvatarBodyProfile; heightCm?: number } = {};
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
  const parsed = UpdateAvatarResponseSchema.safeParse(raw);
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
  const parsed = ListAvatarsResponseSchema.safeParse(raw);
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
  const parsed = GetAvatarResponseSchema.safeParse(raw);
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
  const parsed = DeleteAvatarResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('Invalid delete avatar response');
  }
  return { deletedOutfitsCount: parsed.data.deletedOutfitsCount };
}
