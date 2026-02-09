import { z } from 'zod';
import { router } from './router';
import { db } from '../../db/client';
import { outfit, outfitItem, tryon, avatar, garment, avatarAnalysis } from '../../db/domain.schema';
import { eq, and, or, lt, desc, sql, inArray } from 'drizzle-orm';
import { apiErr } from './response';
import { sha256 } from '../lib/hash';
import { logger } from '../lib/logger';
import { scoreOutfit } from '../prompts/scoreOutfit';
import { generateTryon } from '../prompts/generateTryon';
import {
  CreateOutfitBodySchema,
  CreateOutfitResponseDtoSchema,
  ListOutfitsResponseDtoSchema,
  GetOutfitResponseDtoSchema,
  ScoreOutfitResponseDtoSchema,
  TryonOutfitResponseDtoSchema,
  ListOutfitsByAvatarsBodySchema,
  ListOutfitsByAvatarsResponseDtoSchema,
} from '@shared/dtos/outfit';

const log = logger.child({ module: 'outfits' });

function uploadImageUrl(uploadId: string): string {
  return `/api/uploads/${uploadId}/image`;
}

function dtoResponse<T>(schema: z.ZodType<T>, raw: unknown, status = 200): Response {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    log.warn({ issues: parsed.error.flatten() }, 'DTO validation failed');
    return apiErr({ message: 'Response validation error', issues: parsed.error.flatten() }, 422);
  }
  return Response.json(parsed.data, { status });
}

export const outfitsRoutes = router({
  '/api/avatars/:id/outfits': {
    async POST(req) {
      const avatarId = req.params.id;
      if (!avatarId) return apiErr({ message: 'Missing avatar id' }, 400);

      let rawBody: unknown;
      try {
        rawBody = await req.json();
      } catch {
        return apiErr({ message: 'Invalid JSON' }, 400);
      }

      const bodyParse = CreateOutfitBodySchema.safeParse(rawBody);
      if (!bodyParse.success) {
        return apiErr({ message: 'Validation failed', issues: bodyParse.error.flatten() }, 400);
      }
      const { garmentIds: rawGarmentIds, occasion: rawOccasion } = bodyParse.data;

      const [avatarRow] = await db
        .select({ id: avatar.id })
        .from(avatar)
        .where(eq(avatar.id, avatarId));
      if (!avatarRow) {
        return apiErr({ message: 'Avatar not found' }, 404);
      }

      const garmentIdsSortedUnique = [...new Set(rawGarmentIds)].sort();
      const userGarments = await db
        .select({ id: garment.id })
        .from(garment)
        .where(inArray(garment.id, garmentIdsSortedUnique));
      const foundIds = new Set(userGarments.map((g) => g.id));
      const missing = garmentIdsSortedUnique.filter((id) => !foundIds.has(id));
      if (missing.length > 0) {
        return apiErr({ message: `Garments not found: ${missing.join(', ')}` }, 400);
      }

      const occasionCanon = rawOccasion.trim().toLowerCase();
      const outfitKey = sha256(`${avatarId}:${garmentIdsSortedUnique.join(',')}:${occasionCanon}`);
      const tryonKey = sha256(`${avatarId}:${garmentIdsSortedUnique.join(',')}`);

      const newId = crypto.randomUUID();
      const insertResult = await db
        .insert(outfit)
        .values({
          id: newId,
          avatarId,
          occasion: occasionCanon,
          outfitKey,
          tryonKey,
          status: 'pending',
        })
        .onConflictDoNothing({ target: [outfit.avatarId, outfit.outfitKey] })
        .returning({ id: outfit.id });

      let outfitId: string;
      let cached = false;

      if (insertResult.length > 0 && insertResult[0]) {
        outfitId = insertResult[0].id;
      } else {
        const [existing] = await db
          .select({ id: outfit.id })
          .from(outfit)
          .where(eq(outfit.outfitKey, outfitKey));
        if (!existing) {
          return apiErr({ message: 'Race condition: outfit disappeared' }, 500);
        }
        outfitId = existing.id;
        cached = true;
      }

      for (const gId of garmentIdsSortedUnique) {
        await db
          .insert(outfitItem)
          .values({ id: crypto.randomUUID(), outfitId, garmentId: gId })
          .onConflictDoNothing({ target: [outfitItem.outfitId, outfitItem.garmentId] });
      }

      await db
        .insert(tryon)
        .values({
          id: crypto.randomUUID(),
          avatarId,
          tryonKey,
          status: 'pending',
        })
        .onConflictDoNothing({ target: [tryon.avatarId, tryon.tryonKey] });

      return dtoResponse(CreateOutfitResponseDtoSchema, {
        success: true as const,
        data: { outfitId, cached },
      });
    },

    async GET(req) {
      const avatarId = req.params.id;
      if (!avatarId) return apiErr({ message: 'Missing avatar id' }, 400);

      const rows = await db
        .select({
          id: outfit.id,
          occasion: outfit.occasion,
          status: outfit.status,
          scoreJson: outfit.scoreJson,
          tryonKey: outfit.tryonKey,
          createdAt: outfit.createdAt,
        })
        .from(outfit)
        .where(eq(outfit.avatarId, avatarId))
        .orderBy(desc(outfit.createdAt));

      // Batch-fetch tryon statuses
      const tryonKeys = [...new Set(rows.map((r) => r.tryonKey))];
      let tryonMap = new Map<
        string,
        { id: string; status: string; imageUploadId: string | null }
      >();
      if (tryonKeys.length > 0) {
        const tryonRows = await db
          .select({
            tryonKey: tryon.tryonKey,
            id: tryon.id,
            status: tryon.status,
            imageUploadId: tryon.imageUploadId,
          })
          .from(tryon)
          .where(inArray(tryon.tryonKey, tryonKeys));
        tryonMap = new Map(tryonRows.map((t) => [t.tryonKey, t]));
      }

      const outfits = rows.map((r) => {
        const scoreData = r.scoreJson as { scores?: { overall?: number }; verdict?: string } | null;
        const tryonData = tryonMap.get(r.tryonKey);
        return {
          id: r.id,
          occasion: r.occasion,
          status: r.status,
          overall: scoreData?.scores?.overall ?? null,
          verdict: scoreData?.verdict ?? null,
          tryonId: tryonData?.id ?? null,
          tryonStatus: tryonData?.status ?? null,
          tryonImageUrl: tryonData?.imageUploadId ? uploadImageUrl(tryonData.imageUploadId) : null,
          createdAt: r.createdAt,
        };
      });

      return dtoResponse(ListOutfitsResponseDtoSchema, {
        success: true as const,
        data: { outfits },
      });
    },
  },

  '/api/outfits/by-avatars': {
    async POST(req) {
      let rawBody: unknown;
      try {
        rawBody = await req.json();
      } catch {
        return apiErr({ message: 'Invalid JSON' }, 400);
      }

      const bodyParse = ListOutfitsByAvatarsBodySchema.safeParse(rawBody);
      if (!bodyParse.success) {
        return apiErr({ message: 'Validation failed', issues: bodyParse.error.flatten() }, 400);
      }

      const { avatarIds } = bodyParse.data;

      const rows = await db
        .select({
          id: outfit.id,
          avatarId: outfit.avatarId,
          occasion: outfit.occasion,
          status: outfit.status,
          scoreJson: outfit.scoreJson,
          tryonKey: outfit.tryonKey,
          createdAt: outfit.createdAt,
        })
        .from(outfit)
        .where(inArray(outfit.avatarId, avatarIds))
        .orderBy(desc(outfit.createdAt));

      const tryonKeys = [...new Set(rows.map((r) => r.tryonKey))];
      let tryonMap = new Map<
        string,
        { id: string; status: string; imageUploadId: string | null }
      >();
      if (tryonKeys.length > 0) {
        const tryonRows = await db
          .select({
            tryonKey: tryon.tryonKey,
            id: tryon.id,
            status: tryon.status,
            imageUploadId: tryon.imageUploadId,
          })
          .from(tryon)
          .where(inArray(tryon.tryonKey, tryonKeys));
        tryonMap = new Map(tryonRows.map((t) => [t.tryonKey, t]));
      }

      const groupsMap = new Map<
        string,
        {
          id: string;
          occasion: string;
          status: string;
          overall: number | null;
          verdict: string | null;
          tryonId: string | null;
          tryonStatus: string | null;
          tryonImageUrl: string | null;
          createdAt: Date;
        }[]
      >();

      for (const r of rows) {
        const scoreData = r.scoreJson as { scores?: { overall?: number }; verdict?: string } | null;
        const tryonData = tryonMap.get(r.tryonKey);
        const listItem = {
          id: r.id,
          occasion: r.occasion,
          status: r.status,
          overall: scoreData?.scores?.overall ?? null,
          verdict: scoreData?.verdict ?? null,
          tryonId: tryonData?.id ?? null,
          tryonStatus: tryonData?.status ?? null,
          tryonImageUrl: tryonData?.imageUploadId ? uploadImageUrl(tryonData.imageUploadId) : null,
          createdAt: r.createdAt,
        };
        const arr = groupsMap.get(r.avatarId) ?? [];
        arr.push(listItem);
        groupsMap.set(r.avatarId, arr);
      }

      const groups = Array.from(groupsMap.entries()).map(([avatarId, outfits]) => ({
        avatarId,
        outfits,
      }));

      return dtoResponse(ListOutfitsByAvatarsResponseDtoSchema, {
        success: true as const,
        data: { groups },
      });
    },
  },

  '/api/outfits/:id': async (req) => {
    const id = req.params.id;
    if (!id) return apiErr({ message: 'Missing id' }, 400);

    const [outfitRow] = await db.select().from(outfit).where(eq(outfit.id, id));
    if (!outfitRow) return apiErr({ message: 'Not found' }, 404);

    const garmentRows = await db
      .select({
        id: garment.id,
        name: garment.name,
        category: garment.category,
        uploadId: garment.uploadId,
      })
      .from(outfitItem)
      .innerJoin(garment, eq(outfitItem.garmentId, garment.id))
      .where(eq(outfitItem.outfitId, id));

    const garments = garmentRows.map((g) => ({
      id: g.id,
      name: g.name,
      category: g.category,
      thumbnailUrl: uploadImageUrl(g.uploadId),
    }));

    const [tryonRow] = await db
      .select({
        id: tryon.id,
        status: tryon.status,
        imageUploadId: tryon.imageUploadId,
        errorCode: tryon.errorCode,
        errorMessage: tryon.errorMessage,
      })
      .from(tryon)
      .where(eq(tryon.tryonKey, outfitRow.tryonKey));

    return dtoResponse(GetOutfitResponseDtoSchema, {
      success: true as const,
      data: {
        outfit: {
          id: outfitRow.id,
          avatarId: outfitRow.avatarId,
          occasion: outfitRow.occasion,
          status: outfitRow.status,
          scoreJson: outfitRow.scoreJson,
          errorCode: outfitRow.errorCode,
          errorMessage: outfitRow.errorMessage,
          garments,
          tryon: tryonRow
            ? {
                id: tryonRow.id,
                status: tryonRow.status,
                imageUrl: tryonRow.imageUploadId ? uploadImageUrl(tryonRow.imageUploadId) : null,
                errorCode: tryonRow.errorCode,
                errorMessage: tryonRow.errorMessage,
              }
            : null,
          createdAt: outfitRow.createdAt,
        },
      },
    });
  },

  '/api/outfits/:id/score': {
    async POST(req) {
      const id = req.params.id;
      if (!id) return apiErr({ message: 'Missing id' }, 400);

      const [outfitRow] = await db.select().from(outfit).where(eq(outfit.id, id));
      if (!outfitRow) return apiErr({ message: 'Not found' }, 404);

      // Lock: claim this outfit for scoring if eligible
      const staleThreshold = sql`now() - interval '5 minutes'`;
      const locked = await db
        .update(outfit)
        .set({
          status: 'running',
          errorCode: null,
          errorMessage: null,
          generationStartedAt: sql`now()`,
        })
        .where(
          and(
            eq(outfit.id, id),
            or(
              inArray(outfit.status, ['pending', 'failed']),
              and(eq(outfit.status, 'running'), lt(outfit.generationStartedAt, staleThreshold))
            )
          )
        )
        .returning({ id: outfit.id });

      if (locked.length === 0) {
        // Another process owns it or already succeeded — return current state
        const [current] = await db
          .select({
            status: outfit.status,
            scoreJson: outfit.scoreJson,
            errorCode: outfit.errorCode,
            errorMessage: outfit.errorMessage,
          })
          .from(outfit)
          .where(eq(outfit.id, id));
        return dtoResponse(ScoreOutfitResponseDtoSchema, {
          success: true as const,
          data: {
            status: current?.status ?? outfitRow.status,
            score: current?.scoreJson ?? outfitRow.scoreJson,
            errorCode: current?.errorCode ?? outfitRow.errorCode,
            errorMessage: current?.errorMessage ?? outfitRow.errorMessage,
          },
        });
      }

      try {
        const [avatarRow] = await db
          .select({
            id: avatar.id,
            bodyProfileJson: avatar.bodyProfileJson,
            photoUploadId: avatar.photoUploadId,
          })
          .from(avatar)
          .where(eq(avatar.id, outfitRow.avatarId));

        if (!avatarRow) {
          await setOutfitFailed(id, 'AVATAR_NOT_FOUND', 'Avatar not found');
          return scoreFailResponse('AVATAR_NOT_FOUND', 'Avatar not found');
        }

        let avatarProfile = avatarRow.bodyProfileJson;
        if (!avatarProfile && avatarRow.photoUploadId) {
          const [analysis] = await db
            .select({ responseJson: avatarAnalysis.responseJson })
            .from(avatarAnalysis)
            .where(eq(avatarAnalysis.avatarId, avatarRow.id))
            .orderBy(desc(avatarAnalysis.createdAt))
            .limit(1);
          if (analysis) {
            const resp = analysis.responseJson as { success?: boolean; data?: unknown };
            if (resp.success && resp.data) {
              avatarProfile = resp.data;
            }
          }
        }

        if (!avatarProfile) {
          const msg = 'Avatar has not been analyzed yet. Please analyze the avatar first.';
          await setOutfitFailed(id, 'AVATAR_NOT_ANALYZED', msg);
          return scoreFailResponse('AVATAR_NOT_ANALYZED', msg);
        }

        const garmentRows = await db
          .select({
            name: garment.name,
            category: garment.category,
            garmentProfileJson: garment.garmentProfileJson,
          })
          .from(outfitItem)
          .innerJoin(garment, eq(outfitItem.garmentId, garment.id))
          .where(eq(outfitItem.outfitId, id));

        const garmentInputs = garmentRows.map((g) => ({
          name: g.name,
          category: g.category,
          garmentProfile: g.garmentProfileJson,
        }));

        const scoreResult = await scoreOutfit({
          avatarProfile,
          occasion: outfitRow.occasion,
          garments: garmentInputs,
        });

        await db
          .update(outfit)
          .set({
            status: 'succeeded',
            scoreJson: scoreResult as unknown as Record<string, unknown>,
            errorCode: null,
            errorMessage: null,
          })
          .where(eq(outfit.id, id));

        return dtoResponse(ScoreOutfitResponseDtoSchema, {
          success: true as const,
          data: {
            status: 'succeeded' as const,
            score: scoreResult,
            errorCode: null,
            errorMessage: null,
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const code = 'SCORE_GENERATION_ERROR';
        log.error({ outfitId: id, error: message }, 'score generation failed');
        await setOutfitFailed(id, code, message);
        return scoreFailResponse(code, message);
      }
    },
  },

  '/api/outfits/:id/tryon': {
    async POST(req) {
      const id = req.params.id;
      if (!id) return apiErr({ message: 'Missing id' }, 400);

      const [outfitRow] = await db
        .select({
          id: outfit.id,
          tryonKey: outfit.tryonKey,
          avatarId: outfit.avatarId,
        })
        .from(outfit)
        .where(eq(outfit.id, id));
      if (!outfitRow) return apiErr({ message: 'Not found' }, 404);

      let [tryonRow] = await db.select().from(tryon).where(eq(tryon.tryonKey, outfitRow.tryonKey));

      if (!tryonRow) {
        await db
          .insert(tryon)
          .values({
            id: crypto.randomUUID(),
            avatarId: outfitRow.avatarId,
            tryonKey: outfitRow.tryonKey,
            status: 'pending',
          })
          .onConflictDoNothing({ target: [tryon.avatarId, tryon.tryonKey] });

        [tryonRow] = await db.select().from(tryon).where(eq(tryon.tryonKey, outfitRow.tryonKey));

        if (!tryonRow) {
          return apiErr({ message: 'Failed to create tryon record' }, 500);
        }
      }

      const staleThreshold = sql`now() - interval '5 minutes'`;
      const locked = await db
        .update(tryon)
        .set({
          status: 'running',
          errorCode: null,
          errorMessage: null,
          generationStartedAt: sql`now()`,
        })
        .where(
          and(
            eq(tryon.id, tryonRow.id),
            or(
              inArray(tryon.status, ['pending', 'failed']),
              and(eq(tryon.status, 'running'), lt(tryon.generationStartedAt, staleThreshold))
            )
          )
        )
        .returning({ id: tryon.id });

      if (locked.length === 0) {
        // Already running or succeeded
        const [current] = await db.select().from(tryon).where(eq(tryon.id, tryonRow.id));
        const t = current ?? tryonRow;
        return tryonResponse(t.id, t.status, t.imageUploadId, t.errorCode, t.errorMessage);
      }

      try {
        // Fetch avatar photo upload ID
        const [avatarRow] = await db
          .select({ photoUploadId: avatar.photoUploadId })
          .from(avatar)
          .where(eq(avatar.id, outfitRow.avatarId));

        if (!avatarRow?.photoUploadId) {
          throw new Error('Avatar has no photo uploaded');
        }

        // Fetch garment data (upload ID, bbox, name, category) for this outfit
        const garmentRows = await db
          .select({
            uploadId: garment.uploadId,
            bboxNorm: garment.bboxNorm,
            name: garment.name,
            category: garment.category,
          })
          .from(outfitItem)
          .innerJoin(garment, eq(outfitItem.garmentId, garment.id))
          .where(eq(outfitItem.outfitId, outfitRow.id));

        if (garmentRows.length === 0) {
          throw new Error('No garments found for this outfit');
        }

        // Generate AI try-on image
        const tryonResult = await generateTryon({
          avatarUploadId: avatarRow.photoUploadId,
          garments: garmentRows.map((g) => ({
            uploadId: g.uploadId,
            bboxNorm: g.bboxNorm ?? null,
            name: g.name,
            category: g.category,
          })),
        });

        await db
          .update(tryon)
          .set({
            status: 'succeeded',
            imageUploadId: tryonResult.uploadId,
            errorCode: null,
            errorMessage: null,
          })
          .where(eq(tryon.id, tryonRow.id));

        return tryonResponse(tryonRow.id, 'succeeded', tryonResult.uploadId, null, null);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const code = 'TRYON_GENERATION_ERROR';
        log.error({ tryonId: tryonRow.id, error: message }, 'tryon generation failed');

        await db
          .update(tryon)
          .set({
            status: 'failed',
            errorCode: code,
            errorMessage: message.length > 500 ? message.slice(0, 500) : message,
          })
          .where(eq(tryon.id, tryonRow.id));

        return tryonResponse(tryonRow.id, 'failed', null, code, message);
      }
    },
  },
});

async function setOutfitFailed(outfitId: string, errorCode: string, errorMessage: string) {
  await db
    .update(outfit)
    .set({
      status: 'failed',
      errorCode,
      errorMessage: errorMessage.length > 500 ? errorMessage.slice(0, 500) : errorMessage,
    })
    .where(eq(outfit.id, outfitId));
}

function scoreFailResponse(errorCode: string, errorMessage: string): Response {
  return dtoResponse(ScoreOutfitResponseDtoSchema, {
    success: true as const,
    data: {
      status: 'failed' as const,
      score: null,
      errorCode,
      errorMessage,
    },
  });
}

function tryonResponse(
  id: string,
  status: string,
  imageUploadId: string | null,
  errorCode: string | null,
  errorMessage: string | null
): Response {
  return dtoResponse(TryonOutfitResponseDtoSchema, {
    success: true as const,
    data: {
      id,
      status,
      imageUrl: imageUploadId ? uploadImageUrl(imageUploadId) : null,
      errorCode,
      errorMessage,
    },
  });
}
