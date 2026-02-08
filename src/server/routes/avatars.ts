import { eq, and } from 'drizzle-orm';
import { createHash } from 'crypto';
import { z } from 'zod';
import { router } from './router';
import { db } from '../../db/client';
import { avatar, avatarAnalysis, outfit, upload } from '../../db/domain.schema';
import { getObjectBuffer } from '../lib/storage';
import { logger } from '../lib/logger';
import { analyzeAvatar as analyzeAvatarLib, AVATAR_ANALYSIS_MODEL } from '../prompts/analyzeAvatar';
import { AvatarAnalysisResultSchema } from '@shared/ai-schemas/avatar';
import { apiErr } from './response';
import {
  GetAvatarResponseDtoSchema,
  CreateAvatarResponseDtoSchema,
  UpdateAvatarResponseDtoSchema,
  DeleteAvatarResponseDtoSchema,
  AnalyzeAvatarSuccessDtoSchema,
  AnalyzeAvatarErrorDtoSchema,
  CreateAvatarBodySchema,
  UpdateAvatarBodySchema,
  GenerateAvatarImageBodySchema,
  GenerateAvatarImageResponseDtoSchema,
} from '@shared/dtos/avatar';
import { generateAvatarImage } from '../prompts/generateAvatarImage';

/** Parse payload with schema; on validation failure return 422. */
function parseResponseDto<T>(
  schema: z.ZodType<T>,
  data: unknown
): { ok: true; data: T } | { ok: false; response: Response } {
  const result = schema.safeParse(data);
  if (result.success) return { ok: true, data: result.data };
  return {
    ok: false,
    response: apiErr({ message: 'Validation error', issues: result.error.flatten() }, 422),
  };
}

export const avatarsRoutes = router({
  '/api/avatars': {
    async POST(req) {
      const contentType = req.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        return apiErr(
          {
            message: 'Expected application/json with name, uploadId, and optional heightCm',
          },
          400
        );
      }

      let rawBody: unknown;
      try {
        rawBody = await req.json();
      } catch {
        return apiErr({ message: 'Invalid JSON' }, 400);
      }

      const bodyParse = CreateAvatarBodySchema.safeParse(rawBody);
      if (!bodyParse.success) {
        return apiErr({ message: 'Validation failed', issues: bodyParse.error.flatten() }, 400);
      }
      const { name, uploadId, heightCm } = bodyParse.data;

      let photoUploadId: string | null = null;
      if (uploadId) {
        const [uploadRow] = await db.select().from(upload).where(eq(upload.id, uploadId));
        if (!uploadRow) {
          return apiErr({ message: 'Upload not found' }, 404);
        }
        photoUploadId = uploadId;
      }

      const id = crypto.randomUUID();
      await db.insert(avatar).values({
        id,
        name: name.trim(),
        photoUploadId,
        heightCm: heightCm ?? null,
      });

      const dtoResult = parseResponseDto(CreateAvatarResponseDtoSchema, {
        success: true as const,
        data: { id },
      });
      if (!dtoResult.ok) return dtoResult.response;
      return Response.json(dtoResult.data);
    },
  },

  '/api/avatars/generate-image': {
    async POST(req) {
      const contentType = req.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        return apiErr(
          { message: 'Expected application/json with bodyPhotoUploadId and facePhotoUploadId' },
          400
        );
      }
      let rawBody: unknown;
      try {
        rawBody = await req.json();
      } catch {
        return apiErr({ message: 'Invalid JSON' }, 400);
      }
      const bodyParse = GenerateAvatarImageBodySchema.safeParse(rawBody);
      if (!bodyParse.success) {
        return apiErr({ message: 'Validation failed', issues: bodyParse.error.flatten() }, 400);
      }
      const { bodyPhotoUploadId, facePhotoUploadId } = bodyParse.data;

      const [bodyRow, faceRow] = await Promise.all([
        db.select().from(upload).where(eq(upload.id, bodyPhotoUploadId)),
        db.select().from(upload).where(eq(upload.id, facePhotoUploadId)),
      ]);
      if (!bodyRow[0]) {
        return apiErr({ message: 'Body photo upload not found' }, 404);
      }
      if (!faceRow[0]) {
        return apiErr({ message: 'Face photo upload not found' }, 404);
      }

      try {
        const result = await generateAvatarImage({ bodyPhotoUploadId, facePhotoUploadId });
        const dtoResult = parseResponseDto(GenerateAvatarImageResponseDtoSchema, {
          success: true as const,
          data: { uploadId: result.uploadId },
        });
        if (!dtoResult.ok) return dtoResult.response;
        return Response.json(dtoResult.data);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error({ err, bodyPhotoUploadId, facePhotoUploadId }, 'generate avatar image failed');
        return apiErr({ message: message.length > 500 ? message.slice(0, 500) : message }, 502);
      }
    },
  },

  '/api/avatars/:id/analyze': {
    async POST(req) {
      const id = req.params.id;
      if (!id) {
        return apiErr({ message: 'Missing avatar id' }, 400);
      }

      const [row] = await db.select().from(avatar).where(eq(avatar.id, id));

      if (!row) {
        return apiErr({ message: 'Avatar not found' }, 404);
      }

      if (!row.photoUploadId) {
        return apiErr({ message: 'Avatar has no photo' }, 400);
      }

      const [uploadRow] = await db.select().from(upload).where(eq(upload.id, row.photoUploadId));
      if (!uploadRow) {
        return apiErr({ message: 'Avatar photo upload not found' }, 400);
      }

      const buffer = await getObjectBuffer(uploadRow.storedKey);
      const photoHash = createHash('sha256').update(buffer).digest('hex');
      const mimeType = uploadRow.storedMime;

      // Check for cached analysis with same photo hash and model version
      const [cachedAnalysis] = await db
        .select()
        .from(avatarAnalysis)
        .where(
          and(
            eq(avatarAnalysis.photoHash, photoHash),
            eq(avatarAnalysis.modelVersion, AVATAR_ANALYSIS_MODEL)
          )
        );

      if (cachedAnalysis) {
        logger.info(
          { avatarId: id, photoHashPrefix: photoHash.slice(0, 16) },
          'avatar_analysis cache hit'
        );
        const cached = cachedAnalysis.responseJson as {
          success: boolean;
          data?: unknown;
          error?: unknown;
        };
        if (cached.success === false) {
          const dtoResult = parseResponseDto(AnalyzeAvatarErrorDtoSchema, {
            success: false as const,
            error: (cached as { error: { code: string; message: string; issues: string[] } }).error,
          });
          if (!dtoResult.ok) return dtoResult.response;
          return Response.json(dtoResult.data, { status: 422 });
        }

        const dtoResult = parseResponseDto(AnalyzeAvatarSuccessDtoSchema, {
          success: true as const,
          data: (cached as { data: unknown }).data,
        });
        if (!dtoResult.ok) return dtoResult.response;
        return Response.json(dtoResult.data);
      }

      // No cache - run analysis
      const base64 = buffer.toString('base64');
      const raw = await analyzeAvatarLib([{ base64, mimeType }]);
      const analysisResult = AvatarAnalysisResultSchema.safeParse(raw);
      if (!analysisResult.success) {
        return apiErr({ message: 'Invalid analysis response' }, 502);
      }

      const analysis = analysisResult.data;

      await db
        .insert(avatarAnalysis)
        .values({
          id: crypto.randomUUID(),
          avatarId: id,
          photoHash,
          modelVersion: AVATAR_ANALYSIS_MODEL,
          responseJson: analysis as unknown as Record<string, unknown>,
        })
        .onConflictDoNothing({
          target: [avatarAnalysis.photoHash, avatarAnalysis.modelVersion],
        });

      // Return the row that is now in DB (either we inserted it or it was already there)
      const [analysisRow] = await db
        .select()
        .from(avatarAnalysis)
        .where(
          and(
            eq(avatarAnalysis.photoHash, photoHash),
            eq(avatarAnalysis.modelVersion, AVATAR_ANALYSIS_MODEL)
          )
        );

      if (!analysisRow) {
        return apiErr({ message: 'Failed to save analysis' }, 500);
      }

      const response = analysisRow.responseJson as {
        success: boolean;
        data?: unknown;
        error?: { code: string; message: string; issues: string[] };
      };
      if (response.success === false) {
        const dtoResult = parseResponseDto(AnalyzeAvatarErrorDtoSchema, {
          success: false as const,
          error: response.error!,
        });
        if (!dtoResult.ok) return dtoResult.response;
        return Response.json(dtoResult.data, { status: 422 });
      }
      const dtoResult = parseResponseDto(AnalyzeAvatarSuccessDtoSchema, {
        success: true as const,
        data: response.data,
      });
      if (!dtoResult.ok) return dtoResult.response;
      return Response.json(dtoResult.data);
    },
  },

  '/api/avatars/:id': {
    async GET(req) {
      const id = req.params.id;
      if (!id) {
        return apiErr({ message: 'Missing avatar id' }, 400);
      }

      const [row] = await db.select().from(avatar).where(eq(avatar.id, id));

      if (!row) {
        return apiErr({ message: 'Avatar not found' }, 404);
      }

      const dtoResult = parseResponseDto(GetAvatarResponseDtoSchema, {
        success: true as const,
        data: { avatar: row },
      });
      if (!dtoResult.ok) return dtoResult.response;
      return Response.json(dtoResult.data);
    },

    async PATCH(req) {
      const id = req.params.id;
      if (!id) {
        return apiErr({ message: 'Missing avatar id' }, 400);
      }

      let rawBody: unknown;
      try {
        rawBody = await req.json();
      } catch {
        return apiErr({ message: 'Invalid JSON' }, 400);
      }

      const bodyParse = UpdateAvatarBodySchema.safeParse(rawBody);
      if (!bodyParse.success) {
        return apiErr({ message: 'Invalid body', issues: bodyParse.error.flatten() }, 400);
      }
      const body = bodyParse.data;

      const [row] = await db.select().from(avatar).where(eq(avatar.id, id));

      if (!row) {
        return apiErr({ message: 'Avatar not found' }, 404);
      }

      const updates: { name?: string; bodyProfileJson?: unknown; heightCm?: number } = {};
      if (body.name !== undefined) updates.name = body.name;
      if (body.bodyProfileJson !== undefined) updates.bodyProfileJson = body.bodyProfileJson;
      if (body.heightCm !== undefined) updates.heightCm = body.heightCm;

      if (Object.keys(updates).length === 0) {
        const dtoResult = parseResponseDto(UpdateAvatarResponseDtoSchema, {
          success: true as const,
          data: { avatar: row },
        });
        if (!dtoResult.ok) return dtoResult.response;
        return Response.json(dtoResult.data);
      }

      const [updated] = await db.update(avatar).set(updates).where(eq(avatar.id, id)).returning();
      const dtoResult = parseResponseDto(UpdateAvatarResponseDtoSchema, {
        success: true as const,
        data: { avatar: updated ?? row },
      });
      if (!dtoResult.ok) return dtoResult.response;
      return Response.json(dtoResult.data);
    },

    async DELETE(req) {
      const id = req.params.id;
      if (!id) {
        return apiErr({ message: 'Missing avatar id' }, 400);
      }

      const [row] = await db.select().from(avatar).where(eq(avatar.id, id));

      if (!row) {
        return apiErr({ message: 'Avatar not found' }, 404);
      }

      // Check if avatar has outfits
      const [outfitCount] = await db
        .select({ count: db.$count(outfit, eq(outfit.avatarId, id)) })
        .from(outfit)
        .where(eq(outfit.avatarId, id));

      // Delete avatar (cascades to outfits; upload is kept in uploads table)
      await db.delete(avatar).where(eq(avatar.id, id));

      const dtoResult = parseResponseDto(DeleteAvatarResponseDtoSchema, {
        success: true as const,
        data: { deletedOutfitsCount: outfitCount?.count ?? 0 },
      });
      if (!dtoResult.ok) return dtoResult.response;
      return Response.json(dtoResult.data);
    },
  },
});
