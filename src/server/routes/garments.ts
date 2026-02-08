import { eq, and, inArray, desc } from 'drizzle-orm';
import { router } from './router';
import { db } from '../../db/client';
import { garment, garmentDetection, upload } from '../../db/domain.schema';
import { getObjectBuffer } from '../lib/storage';
import { detectGarmentsFromImage } from '../prompts/detectGarments';
import { apiOk, apiErr } from './response';
import {
  DetectGarmentsBodySchema,
  CreateGarmentsBodySchema,
  UpdateGarmentBodySchema,
} from '@shared/dtos/garment';

export const garmentsRoutes = router({
  '/api/garments': {
    async GET(req) {
      const url = new URL(req.url);
      const category = url.searchParams.get('category')?.trim() || undefined;
      const search = url.searchParams.get('search')?.trim() || undefined;

      const conditions = [];
      if (category) conditions.push(eq(garment.category, category));

      const rows = await db
        .select({
          id: garment.id,
          uploadId: garment.uploadId,
          name: garment.name,
          category: garment.category,
          bboxNorm: garment.bboxNorm,
          createdAt: garment.createdAt,
          updatedAt: garment.updatedAt,
        })
        .from(garment)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(garment.createdAt));

      let list = rows.map((r) => ({
        id: r.id,
        uploadId: r.uploadId,
        imageUrl: `/api/uploads/${r.uploadId}/image`,
        name: r.name,
        category: r.category,
        bboxNorm: r.bboxNorm ?? null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }));

      if (search) {
        const lower = search.toLowerCase();
        list = list.filter((g) => (g.name ?? '').toLowerCase().includes(lower));
      }

      return apiOk({ garments: list });
    },

    async POST(req) {
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return apiErr({ code: 'INVALID_JSON', message: 'Invalid JSON' }, 400);
      }

      const parsed = CreateGarmentsBodySchema.safeParse(body);
      if (!parsed.success) {
        return apiErr(
          { code: 'VALIDATION_ERROR', message: parsed.error.message ?? 'Invalid body' },
          400
        );
      }

      const { detectionIds, overrides = {} } = parsed.data;
      if (detectionIds.length === 0) {
        return apiErr(
          { code: 'EMPTY_DETECTION_IDS', message: 'detectionIds must be non-empty' },
          400
        );
      }

      const detections = await db
        .select()
        .from(garmentDetection)
        .where(inArray(garmentDetection.id, detectionIds));

      if (detections.length !== detectionIds.length) {
        return apiErr(
          {
            code: 'DETECTION_NOT_FOUND',
            message: 'Some detections not found',
          },
          404
        );
      }

      const createdIds: string[] = [];
      for (const d of detections) {
        const override = overrides[d.id];
        const id = crypto.randomUUID();
        await db.insert(garment).values({
          id,
          uploadId: d.uploadId,
          bboxNorm: d.bboxNorm,
          name: override?.name ?? d.labelGuess ?? 'Unnamed',
          category: override?.category ?? d.categoryGuess ?? null,
          garmentProfileJson: d.garmentProfileJson,
        });
        createdIds.push(id);
      }

      return apiOk({ createdIds });
    },
  },

  '/api/garments/detect': {
    async POST(req) {
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return apiErr({ code: 'INVALID_JSON', message: 'Invalid JSON' }, 400);
      }

      const parsed = DetectGarmentsBodySchema.safeParse(body);
      if (!parsed.success) {
        return apiErr(
          { code: 'VALIDATION_ERROR', message: parsed.error.message ?? 'Invalid body' },
          400
        );
      }

      const { uploadId } = parsed.data;

      const [uploadRow] = await db.select().from(upload).where(eq(upload.id, uploadId));

      if (!uploadRow) {
        return apiErr({ code: 'UPLOAD_NOT_FOUND', message: 'Upload not found' }, 404);
      }

      let buffer: Buffer;
      try {
        buffer = await getObjectBuffer(uploadRow.storedKey);
      } catch {
        return apiErr({ code: 'STORAGE_ERROR', message: 'Failed to load image from storage' }, 500);
      }

      const { detections: aiDetections } = await detectGarmentsFromImage({
        image: { buffer, mimeType: uploadRow.storedMime },
      });

      const imageUrl = `/api/uploads/${uploadId}/image`;

      const inserted: {
        id: string;
        bbox: (typeof aiDetections)[0]['bbox'];
        categoryGuess: string | null;
        labelGuess: string | null;
        confidence: number | null;
        garmentProfile: unknown;
      }[] = [];

      for (const d of aiDetections) {
        const id = crypto.randomUUID();
        const confidence = d.confidence;
        await db.insert(garmentDetection).values({
          id,
          uploadId,
          bboxNorm: d.bbox,
          categoryGuess: d.category ?? null,
          labelGuess: d.label ?? null,
          garmentProfileJson: d.garment_profile ? (d.garment_profile as object) : null,
          confidence: confidence ?? null,
        });
        inserted.push({
          id,
          bbox: d.bbox,
          categoryGuess: d.category ?? null,
          labelGuess: d.label ?? null,
          confidence: confidence ?? null,
          garmentProfile: d.garment_profile ?? null,
        });
      }

      return apiOk({
        uploadId,
        imageUrl,
        detections: inserted.map((d) => ({
          id: d.id,
          bbox: d.bbox,
          categoryGuess: d.categoryGuess,
          labelGuess: d.labelGuess,
          confidence: d.confidence,
          garmentProfile: d.garmentProfile,
        })),
      });
    },
  },

  '/api/garments/:id': {
    async GET(req) {
      const id = req.params.id;
      if (!id) return apiErr({ code: 'MISSING_ID', message: 'Missing garment id' }, 400);

      const [row] = await db.select().from(garment).where(eq(garment.id, id));

      if (!row) {
        return apiErr({ code: 'NOT_FOUND', message: 'Garment not found' }, 404);
      }

      return apiOk({
        garment: {
          id: row.id,
          uploadId: row.uploadId,
          imageUrl: `/api/uploads/${row.uploadId}/image`,
          name: row.name,
          category: row.category,
          bboxNorm: row.bboxNorm ?? null,
          garmentProfileJson: row.garmentProfileJson ?? null,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        },
      });
    },

    async PATCH(req) {
      const id = req.params.id;
      if (!id) return apiErr({ code: 'MISSING_ID', message: 'Missing garment id' }, 400);

      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return apiErr({ code: 'INVALID_JSON', message: 'Invalid JSON' }, 400);
      }

      const parsed = UpdateGarmentBodySchema.safeParse(body);
      if (!parsed.success) {
        return apiErr(
          { code: 'VALIDATION_ERROR', message: parsed.error.message ?? 'Invalid body' },
          400
        );
      }

      const [existing] = await db.select().from(garment).where(eq(garment.id, id));

      if (!existing) {
        return apiErr({ code: 'NOT_FOUND', message: 'Garment not found' }, 404);
      }

      const updates: {
        name?: string | null;
        category?: string | null;
        garmentProfileJson?: unknown;
      } = {};
      if (parsed.data.name !== undefined) updates.name = parsed.data.name;
      if (parsed.data.category !== undefined) updates.category = parsed.data.category;
      if (parsed.data.garmentProfileJson !== undefined)
        updates.garmentProfileJson = parsed.data.garmentProfileJson;

      if (Object.keys(updates).length === 0) {
        return apiOk({
          garment: {
            id: existing.id,
            uploadId: existing.uploadId,
            imageUrl: `/api/uploads/${existing.uploadId}/image`,
            name: existing.name,
            category: existing.category,
            bboxNorm: existing.bboxNorm ?? null,
            garmentProfileJson: existing.garmentProfileJson ?? null,
            createdAt: existing.createdAt.toISOString(),
            updatedAt: existing.updatedAt.toISOString(),
          },
        });
      }

      const [updated] = await db.update(garment).set(updates).where(eq(garment.id, id)).returning();

      if (!updated) return apiErr({ code: 'UPDATE_FAILED', message: 'Update failed' }, 500);

      return apiOk({
        garment: {
          id: updated.id,
          uploadId: updated.uploadId,
          imageUrl: `/api/uploads/${updated.uploadId}/image`,
          name: updated.name,
          category: updated.category,
          bboxNorm: updated.bboxNorm ?? null,
          garmentProfileJson: updated.garmentProfileJson ?? null,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
      });
    },

    async DELETE(req) {
      const id = req.params.id;
      if (!id) return apiErr({ code: 'MISSING_ID', message: 'Missing garment id' }, 400);

      const [existing] = await db
        .select({ id: garment.id })
        .from(garment)
        .where(eq(garment.id, id));

      if (!existing) {
        return apiErr({ code: 'NOT_FOUND', message: 'Garment not found' }, 404);
      }

      await db.delete(garment).where(eq(garment.id, id));

      return apiOk({ deleted: true });
    },
  },
});
