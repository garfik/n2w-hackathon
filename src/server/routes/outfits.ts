import { router } from './router';
import { requireUser } from '../lib/requireUser';
import { db } from '../../db/client';
import { outfit, outfitGarment, avatar, garment } from '../../db/domain.schema';
import { eq, and, desc } from 'drizzle-orm';
import { apiOk, apiErr } from './response';

/** Garment image URL via upload (uploads.id). */
function garmentImageUrl(uploadId: string): string {
  return `/api/uploads/${uploadId}/image`;
}

export const outfitsRoutes = router({
  '/api/outfits': {
    async GET(req) {
      const result = await requireUser(req);
      if (result instanceof Response) return result;

      const url = new URL(req.url);
      const avatarIdFilter = url.searchParams.get('avatarId');

      // Build where conditions
      const conditions = [eq(outfit.userId, result.userId)];
      if (avatarIdFilter) {
        conditions.push(eq(outfit.avatarId, avatarIdFilter));
      }

      const rows = await db
        .select({
          id: outfit.id,
          avatarId: outfit.avatarId,
          occasion: outfit.occasion,
          createdAt: outfit.createdAt,
        })
        .from(outfit)
        .where(and(...conditions))
        .orderBy(desc(outfit.createdAt));

      return apiOk({ outfits: rows });
    },

    async POST(req) {
      const result = await requireUser(req);
      if (result instanceof Response) return result;

      let body: { garmentIds?: string[]; occasion?: string; avatarId?: string };
      try {
        body = (await req.json()) as {
          garmentIds?: string[];
          occasion?: string;
          avatarId?: string;
        };
      } catch {
        return apiErr({ message: 'Invalid JSON' }, 400);
      }
      const garmentIds = body.garmentIds;
      const occasion = body.occasion?.trim();
      const avatarId = body.avatarId;

      if (!Array.isArray(garmentIds) || garmentIds.length === 0 || !occasion) {
        return apiErr({ message: 'garmentIds (non-empty array) and occasion required' }, 400);
      }

      // If avatarId provided, verify it belongs to user; otherwise use first avatar
      let targetAvatarId: string;
      if (avatarId) {
        const [targetAvatar] = await db
          .select({ id: avatar.id })
          .from(avatar)
          .where(and(eq(avatar.id, avatarId), eq(avatar.userId, result.userId)));
        if (!targetAvatar) {
          return apiErr({ message: 'Avatar not found' }, 404);
        }
        targetAvatarId = targetAvatar.id;
      } else {
        const [firstAvatar] = await db
          .select({ id: avatar.id })
          .from(avatar)
          .where(eq(avatar.userId, result.userId))
          .limit(1);
        if (!firstAvatar) {
          return apiErr({ message: 'Create an avatar first' }, 400);
        }
        targetAvatarId = firstAvatar.id;
      }

      const userGarments = await db
        .select({ id: garment.id })
        .from(garment)
        .where(eq(garment.userId, result.userId));
      const userGarmentIds = new Set(userGarments.map((g) => g.id));
      const invalid = garmentIds.filter((gid) => !userGarmentIds.has(gid));
      if (invalid.length > 0) {
        return apiErr({ message: 'Some garments do not belong to you' }, 400);
      }

      const id = crypto.randomUUID();
      await db.insert(outfit).values({
        id,
        userId: result.userId,
        avatarId: targetAvatarId,
        occasion,
      });
      for (const garmentId of garmentIds) {
        await db.insert(outfitGarment).values({ outfitId: id, garmentId });
      }

      return apiOk({ id });
    },
  },

  '/api/outfits/:id': async (req) => {
    const result = await requireUser(req);
    if (result instanceof Response) return result;
    const id = req.params.id;
    if (!id) return apiErr({ message: 'Missing id' }, 400);

    const [outfitRow] = await db
      .select()
      .from(outfit)
      .where(and(eq(outfit.id, id), eq(outfit.userId, result.userId)));
    if (!outfitRow) return apiErr({ message: 'Not found' }, 404);

    const garmentRows = await db
      .select({
        id: garment.id,
        name: garment.name,
        uploadId: garment.uploadId,
      })
      .from(outfitGarment)
      .innerJoin(garment, eq(outfitGarment.garmentId, garment.id))
      .where(eq(outfitGarment.outfitId, id));

    const garments = garmentRows.map((g) => ({
      id: g.id,
      name: g.name,
      thumbnailUrl: garmentImageUrl(g.uploadId),
    }));

    return apiOk({
      outfit: {
        id: outfitRow.id,
        occasion: outfitRow.occasion,
        resultImageKey: outfitRow.resultImageKey,
        scoreJson: outfitRow.scoreJson,
        garments,
        resultImageUrl: outfitRow.resultImageKey
          ? `/api/storage/object?key=${encodeURIComponent(outfitRow.resultImageKey)}`
          : null,
      },
    });
  },
});
