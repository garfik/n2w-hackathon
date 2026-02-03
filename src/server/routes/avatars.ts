import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { router } from './router';
import { requireUser } from '../lib/requireUser';
import { db } from '../../db/client';
import { avatar, outfit } from '../../db/domain.schema';
import { putObject, getObjectBuffer, deleteObject } from '../lib/storage';
import { analyzeAvatar as analyzeAvatarLib } from '../prompts/analyzeAvatar';
import { AvatarAnalysisResultSchema } from '@shared/ai-schemas/avatar';
import {
  ListAvatarsResponseDtoSchema,
  GetAvatarResponseDtoSchema,
  CreateAvatarResponseDtoSchema,
  UpdateAvatarResponseDtoSchema,
  DeleteAvatarResponseDtoSchema,
  AnalyzeAvatarSuccessDtoSchema,
  AnalyzeAvatarErrorDtoSchema,
  UpdateAvatarBodySchema,
} from '@shared/dtos/avatar';

/** Parse payload with schema; on validation failure return 422 instead of 500. */
function parseResponseDto<T>(
  schema: z.ZodType<T>,
  data: unknown
): { ok: true; data: T } | { ok: false; response: Response } {
  const result = schema.safeParse(data);
  if (result.success) return { ok: true, data: result.data };
  return {
    ok: false,
    response: Response.json(
      { error: 'Validation error', issues: result.error.flatten() },
      { status: 422 }
    ),
  };
}

function mimeFromKey(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

export const avatarsRoutes = router({
  '/api/avatars': {
    async GET(req) {
      const result = await requireUser(req);
      if (!result.ok) return result.response;

      const rows = await db
        .select()
        .from(avatar)
        .where(eq(avatar.userId, result.userId))
        .orderBy(desc(avatar.createdAt));

      const dtoResult = parseResponseDto(ListAvatarsResponseDtoSchema, {
        ok: true as const,
        avatars: rows,
      });
      if (!dtoResult.ok) return dtoResult.response;
      return Response.json(dtoResult.data);
    },

    async POST(req) {
      const result = await requireUser(req);
      if (!result.ok) return result.response;

      const contentType = req.headers.get('content-type') ?? '';
      if (!contentType.includes('multipart/form-data')) {
        return Response.json({ error: 'Expected multipart/form-data' }, { status: 400 });
      }

      const formData = await req.formData();
      const file = formData.get('file') ?? formData.get('image');
      if (!file || !(file instanceof File)) {
        return Response.json({ error: 'Missing file or image' }, { status: 400 });
      }

      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const id = crypto.randomUUID();
      const key = `avatars/${result.userId}/${id}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const mime = file.type || (ext === 'png' ? 'image/png' : 'image/jpeg');
      await putObject(key, buffer, mime);

      const name = (formData.get('name') as string) || file.name || 'Avatar';
      await db.insert(avatar).values({
        id,
        userId: result.userId,
        name,
        sourcePhotoKey: key,
      });

      const dtoResult = parseResponseDto(CreateAvatarResponseDtoSchema, {
        ok: true as const,
        id,
      });
      if (!dtoResult.ok) return dtoResult.response;
      return Response.json(dtoResult.data);
    },
  },

  '/api/avatars/:id/analyze': {
    async POST(req) {
      const result = await requireUser(req);
      if (!result.ok) return result.response;

      const id = req.params.id;
      if (!id) {
        return Response.json({ error: 'Missing avatar id' }, { status: 400 });
      }

      const [row] = await db
        .select()
        .from(avatar)
        .where(and(eq(avatar.id, id), eq(avatar.userId, result.userId)));

      if (!row) {
        return Response.json({ error: 'Avatar not found' }, { status: 404 });
      }

      if (row.bodyProfileJson != null) {
        return Response.json({ ok: false, error: 'Avatar already analyzed' }, { status: 409 });
      }

      const sourceKey = row.sourcePhotoKey;
      if (!sourceKey) {
        return Response.json({ error: 'Avatar has no source photo' }, { status: 400 });
      }

      const buffer = await getObjectBuffer(sourceKey);
      const base64 = buffer.toString('base64');
      const mimeType = mimeFromKey(sourceKey);

      const raw = await analyzeAvatarLib([{ base64, mimeType }]);
      const analysisResult = AvatarAnalysisResultSchema.safeParse(raw);
      if (!analysisResult.success) {
        return Response.json({ ok: false, error: 'Invalid analysis response' }, { status: 502 });
      }

      const analysis = analysisResult.data;

      if (analysis.success === false) {
        const dtoResult = parseResponseDto(AnalyzeAvatarErrorDtoSchema, {
          ok: false as const,
          error: {
            code: analysis.error.code,
            message: analysis.error.message,
            issues: analysis.error.issues,
          },
        });
        if (!dtoResult.ok) return dtoResult.response;
        return Response.json(dtoResult.data, { status: 422 });
      }

      const bodyProfile = analysis.data;
      await db
        .update(avatar)
        .set({ bodyProfileJson: bodyProfile as unknown as Record<string, unknown> })
        .where(eq(avatar.id, id));

      const dtoResult = parseResponseDto(AnalyzeAvatarSuccessDtoSchema, {
        ok: true as const,
        data: bodyProfile,
      });
      if (!dtoResult.ok) return dtoResult.response;
      return Response.json(dtoResult.data);
    },
  },

  '/api/avatars/:id': {
    async GET(req) {
      const result = await requireUser(req);
      if (!result.ok) return result.response;

      const id = req.params.id;
      if (!id) {
        return Response.json({ error: 'Missing avatar id' }, { status: 400 });
      }

      const [row] = await db
        .select()
        .from(avatar)
        .where(and(eq(avatar.id, id), eq(avatar.userId, result.userId)));

      if (!row) {
        return Response.json({ error: 'Avatar not found' }, { status: 404 });
      }

      const dtoResult = parseResponseDto(GetAvatarResponseDtoSchema, {
        ok: true as const,
        avatar: row,
      });
      if (!dtoResult.ok) return dtoResult.response;
      return Response.json(dtoResult.data);
    },

    async PATCH(req) {
      const result = await requireUser(req);
      if (!result.ok) return result.response;

      const id = req.params.id;
      if (!id) {
        return Response.json({ error: 'Missing avatar id' }, { status: 400 });
      }

      let rawBody: unknown;
      try {
        rawBody = await req.json();
      } catch {
        return Response.json({ error: 'Invalid JSON' }, { status: 400 });
      }

      const bodyParse = UpdateAvatarBodySchema.safeParse(rawBody);
      if (!bodyParse.success) {
        return Response.json(
          { error: 'Invalid body', issues: bodyParse.error.flatten() },
          { status: 400 }
        );
      }
      const body = bodyParse.data;

      const [row] = await db
        .select()
        .from(avatar)
        .where(and(eq(avatar.id, id), eq(avatar.userId, result.userId)));

      if (!row) {
        return Response.json({ error: 'Avatar not found' }, { status: 404 });
      }

      const updates: { name?: string; bodyProfileJson?: unknown; heightCm?: number } = {};
      if (body.name !== undefined) updates.name = body.name;
      if (body.bodyProfileJson !== undefined) updates.bodyProfileJson = body.bodyProfileJson;
      if (body.heightCm !== undefined) updates.heightCm = body.heightCm;

      if (Object.keys(updates).length === 0) {
        const dtoResult = parseResponseDto(UpdateAvatarResponseDtoSchema, {
          ok: true as const,
          avatar: row,
        });
        if (!dtoResult.ok) return dtoResult.response;
        return Response.json(dtoResult.data);
      }

      const [updated] = await db.update(avatar).set(updates).where(eq(avatar.id, id)).returning();
      const dtoResult = parseResponseDto(UpdateAvatarResponseDtoSchema, {
        ok: true as const,
        avatar: updated ?? row,
      });
      if (!dtoResult.ok) return dtoResult.response;
      return Response.json(dtoResult.data);
    },

    async DELETE(req) {
      const result = await requireUser(req);
      if (!result.ok) return result.response;

      const id = req.params.id;
      if (!id) {
        return Response.json({ error: 'Missing avatar id' }, { status: 400 });
      }

      const [row] = await db
        .select()
        .from(avatar)
        .where(and(eq(avatar.id, id), eq(avatar.userId, result.userId)));

      if (!row) {
        return Response.json({ error: 'Avatar not found' }, { status: 404 });
      }

      // Check if avatar has outfits
      const [outfitCount] = await db
        .select({ count: db.$count(outfit, eq(outfit.avatarId, id)) })
        .from(outfit)
        .where(eq(outfit.avatarId, id));

      // Delete associated storage file if exists
      if (row.sourcePhotoKey) {
        try {
          await deleteObject(row.sourcePhotoKey);
        } catch {
          // Ignore storage deletion errors
        }
      }

      // Delete avatar (cascades to outfits via FK)
      await db.delete(avatar).where(eq(avatar.id, id));

      const dtoResult = parseResponseDto(DeleteAvatarResponseDtoSchema, {
        ok: true as const,
        deletedOutfitsCount: outfitCount?.count ?? 0,
      });
      if (!dtoResult.ok) return dtoResult.response;
      return Response.json(dtoResult.data);
    },
  },
});
