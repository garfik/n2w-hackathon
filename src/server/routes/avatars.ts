import { eq, and, desc } from 'drizzle-orm';
import { router } from './router';
import { requireUser } from '../lib/requireUser';
import { db } from '../../db/client';
import { avatar, outfit } from '../../db/domain.schema';
import { putObject, getObjectBuffer, deleteObject } from '../lib/storage';
import { analyzeAvatar as analyzeAvatarLib } from '../prompts/analyzeAvatar';
import { AvatarAnalysisResultSchema } from '@shared/schemas/avatar';

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

      return Response.json({ ok: true, avatars: rows });
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

      return Response.json({ ok: true, id });
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
      const parsed = AvatarAnalysisResultSchema.safeParse(raw);
      if (!parsed.success) {
        return Response.json({ ok: false, error: 'Invalid analysis response' }, { status: 502 });
      }

      const analysis = parsed.data;

      if (analysis.success === false) {
        return Response.json(
          {
            ok: false,
            error: {
              code: analysis.error.code,
              message: analysis.error.message,
              issues: analysis.error.issues,
            },
          },
          { status: 422 }
        );
      }

      const bodyProfile = analysis.data;
      await db
        .update(avatar)
        .set({ bodyProfileJson: bodyProfile as unknown as Record<string, unknown> })
        .where(eq(avatar.id, id));

      return Response.json({ ok: true, data: bodyProfile });
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

      return Response.json({ ok: true, avatar: row });
    },

    async PATCH(req) {
      const result = await requireUser(req);
      if (!result.ok) return result.response;

      const id = req.params.id;
      if (!id) {
        return Response.json({ error: 'Missing avatar id' }, { status: 400 });
      }

      let body: { name?: string; bodyProfileJson?: unknown; heightCm?: number };
      try {
        body = (await req.json()) as {
          name?: string;
          bodyProfileJson?: unknown;
          heightCm?: number;
        };
      } catch {
        return Response.json({ error: 'Invalid JSON' }, { status: 400 });
      }

      const [row] = await db
        .select()
        .from(avatar)
        .where(and(eq(avatar.id, id), eq(avatar.userId, result.userId)));

      if (!row) {
        return Response.json({ error: 'Avatar not found' }, { status: 404 });
      }

      const updates: { name?: string; bodyProfileJson?: unknown; heightCm?: number } = {};
      if (typeof body.name === 'string' && body.name.trim()) {
        updates.name = body.name.trim();
      }
      if (body.bodyProfileJson !== undefined) {
        updates.bodyProfileJson = body.bodyProfileJson;
      }
      if (typeof body.heightCm === 'number' && body.heightCm >= 0) {
        updates.heightCm = Math.round(body.heightCm);
      }

      if (Object.keys(updates).length === 0) {
        return Response.json({ ok: true, avatar: row });
      }

      const [updated] = await db.update(avatar).set(updates).where(eq(avatar.id, id)).returning();

      return Response.json({ ok: true, avatar: updated ?? row });
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

      return Response.json({
        ok: true,
        deletedOutfitsCount: outfitCount?.count ?? 0,
      });
    },
  },
});
