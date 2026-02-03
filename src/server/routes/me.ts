import { router } from './router';
import { requireUser } from '../lib/requireUser';

export const meRoutes = router({
  '/api/me': {
    async GET(req) {
      const result = await requireUser(req);
      if (!result.ok) return result.response;
      return Response.json({
        ok: true,
        userId: result.userId,
        email: result.email,
      });
    },
  },
});
