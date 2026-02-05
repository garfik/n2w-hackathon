import { router } from './router';
import { requireUser } from '../lib/requireUser';
import { db } from '../../db/client';
import { garment } from '../../db/domain.schema';
import { putObject } from '../lib/storage';
import { apiOk, apiErr } from './response';

function thumbnailUrl(key: string): string {
  return `/api/storage/object?key=${encodeURIComponent(key)}`;
}

export const garmentsRoutes = router({
  '/api/garments': {
    async POST(req) {
      const result = await requireUser(req);
      if (result instanceof Response) return result;

      const contentType = req.headers.get('content-type') ?? '';
      if (!contentType.includes('multipart/form-data')) {
        return apiErr({ message: 'Expected multipart/form-data' }, 400);
      }

      const formData = await req.formData();
      const file = formData.get('file') ?? formData.get('image');
      if (!file || !(file instanceof File)) {
        return apiErr({ message: 'Missing file or image' }, 400);
      }

      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const id = crypto.randomUUID();
      const key = `garments/${result.userId}/${id}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const mime = file.type || (ext === 'png' ? 'image/png' : 'image/jpeg');
      await putObject(key, buffer, mime);

      const name = (formData.get('name') as string) || file.name || 'Garment';
      await db.insert(garment).values({
        id,
        userId: result.userId,
        name,
        originalImageKey: key,
      });

      return apiOk({ id, thumbnailUrl: thumbnailUrl(key) });
    },
  },
});
