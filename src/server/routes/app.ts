import { router } from './router';
import { requireUser } from '../lib/requireUser';
import { db } from '../../db/client';
import { avatar } from '../../db/domain.schema';
import { eq, count } from 'drizzle-orm';
import { apiOk } from './response';

export const appRoutes = router({
  '/api/app/bootstrap': {
    async GET(req) {
      const result = await requireUser(req);
      if (result instanceof Response) return result;

      const [row] = await db
        .select({ count: count() })
        .from(avatar)
        .where(eq(avatar.userId, result.userId));

      const avatarExists = (row?.count ?? 0) > 0;

      return apiOk({ avatarExists });
    },
  },
});
