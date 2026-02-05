import { router } from './router';
import { requireUser } from '../lib/requireUser';
import { apiOk } from './response';

export const meRoutes = router({
  '/api/me': {
    async GET(req) {
      const result = await requireUser(req);
      if (result instanceof Response) return result;
      return apiOk({ userId: result.userId, email: result.email });
    },
  },
});
