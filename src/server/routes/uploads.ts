import { eq, and } from 'drizzle-orm';
import { router } from './router';
import { requireUser } from '../lib/requireUser';
import { db } from '../../db/client';
import { upload } from '../../db/domain.schema';
import { putObject, getObjectBuffer } from '../lib/storage';
import { sha256 } from '../lib/hash';
import { processImage } from '../lib/image/processImage';
import { logger } from '../lib/logger';
import { apiOk, apiErr } from './response';

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

export const uploadsRoutes = router({
  '/api/uploads': {
    async POST(req) {
      const userResult = await requireUser(req);
      if (userResult instanceof Response) return userResult;
      const { userId } = userResult;

      const contentType = req.headers.get('content-type') ?? '';
      if (!contentType.includes('multipart/form-data')) {
        return apiErr(
          { code: 'INVALID_CONTENT_TYPE', message: 'Expected multipart/form-data' },
          400
        );
      }

      let formData: FormData;
      try {
        formData = await req.formData();
      } catch (err) {
        logger.warn({ err }, 'Failed to parse form data');
        return apiErr({ code: 'INVALID_FORM_DATA', message: 'Failed to parse form data' }, 400);
      }

      const file = formData.get('file');
      if (!file || !(file instanceof File)) {
        return apiErr({ code: 'MISSING_FILE', message: 'Missing "file" field in form data' }, 400);
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return apiErr(
          {
            code: 'FILE_TOO_LARGE',
            message: `File size exceeds maximum of ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`,
          },
          413
        );
      }

      const originalMime = file.type.toLowerCase() || 'application/octet-stream';
      const arrayBuffer = await file.arrayBuffer();
      const originalBuffer = Buffer.from(arrayBuffer);
      const originalSha256 = sha256(originalBuffer);
      const originalSizeBytes = originalBuffer.length;

      logger.info(
        { userId, originalMime, originalSizeBytes, hashPrefix: originalSha256.slice(0, 12) },
        'Processing upload'
      );

      const [existing] = await db
        .select()
        .from(upload)
        .where(eq(upload.originalSha256, originalSha256));

      if (existing) {
        if (existing.userId === userId) {
          logger.info({ uploadId: existing.id }, 'Returning existing upload (same user)');
          return apiOk({
            id: existing.id,
            url: `/api/uploads/${existing.id}/image`,
            width: existing.width,
            height: existing.height,
            mimeType: existing.storedMime,
          });
        }
        // Other user's upload: create link record for current user
        const newId = crypto.randomUUID();
        await db.insert(upload).values({
          id: newId,
          userId,
          originalSha256,
          originalMime,
          originalSizeBytes,
          storedKey: existing.storedKey,
          storedMime: existing.storedMime,
          storedSizeBytes: existing.storedSizeBytes,
          width: existing.width,
          height: existing.height,
        });
        logger.info(
          { uploadId: newId, linkedFrom: existing.id },
          'Created linked upload (different user, same content)'
        );
        return apiOk({
          id: newId,
          url: `/api/uploads/${newId}/image`,
          width: existing.width,
          height: existing.height,
          mimeType: existing.storedMime,
        });
      }

      let processed;
      try {
        processed = await processImage(originalBuffer);
      } catch (err) {
        logger.error({ err, originalMime }, 'Failed to process image');
        return apiErr(
          {
            code: 'IMAGE_PROCESSING_FAILED',
            message: err instanceof Error ? err.message : 'Failed to process image',
          },
          422
        );
      }

      const id = crypto.randomUUID();
      const storedKey = `uploads/${id}.jpg`;

      try {
        await putObject(storedKey, processed.jpegBuffer, 'image/jpeg');
      } catch (err) {
        logger.error({ err, storedKey }, 'Failed to upload to S3');
        return apiErr({ code: 'STORAGE_ERROR', message: 'Failed to save image to storage' }, 500);
      }

      try {
        await db.insert(upload).values({
          id,
          userId,
          originalSha256,
          originalMime,
          originalSizeBytes,
          storedKey,
          storedMime: 'image/jpeg',
          storedSizeBytes: processed.storedSizeBytes,
          width: processed.width,
          height: processed.height,
        });
      } catch (err) {
        logger.error({ err, id }, 'Failed to save upload record');
        return apiErr({ code: 'DATABASE_ERROR', message: 'Failed to save upload record' }, 500);
      }

      logger.info(
        {
          uploadId: id,
          width: processed.width,
          height: processed.height,
          storedSizeBytes: processed.storedSizeBytes,
        },
        'Upload completed'
      );

      return apiOk({
        id,
        url: `/api/uploads/${id}/image`,
        width: processed.width,
        height: processed.height,
        mimeType: 'image/jpeg',
      });
    },
  },

  '/api/uploads/:id/image': {
    async GET(req) {
      const userResult = await requireUser(req);
      if (userResult instanceof Response) return userResult;
      const { userId } = userResult;

      const { id } = req.params;
      if (!id) {
        return apiErr({ code: 'MISSING_ID', message: 'Missing upload ID' }, 400);
      }

      const [row] = await db
        .select()
        .from(upload)
        .where(and(eq(upload.id, id), eq(upload.userId, userId)));

      if (!row) {
        return apiErr({ code: 'NOT_FOUND', message: 'Upload not found' }, 404);
      }

      try {
        const buffer = await getObjectBuffer(row.storedKey);
        return new Response(new Uint8Array(buffer), {
          headers: {
            'Content-Type': row.storedMime,
            'Content-Length': String(buffer.length),
            'Cache-Control': 'private, max-age=31536000, immutable',
          },
        });
      } catch (err) {
        logger.error({ err, storedKey: row.storedKey }, 'Failed to fetch from S3');
        return apiErr({ code: 'STORAGE_ERROR', message: 'Failed to retrieve image' }, 500);
      }
    },
  },
});
