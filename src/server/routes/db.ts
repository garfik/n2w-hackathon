import { router } from './router';
import { db } from '../../db/client';
import { sql } from 'drizzle-orm';

export const dbRoutes = router({
  '/api/db/ping': {
    async GET() {
      try {
        const rows = await db.execute(sql`select now() as now`);
        return Response.json({
          ok: true,
          now: rows.rows?.[0]?.now ?? null,
        });
      } catch (err) {
        return Response.json(
          { ok: false, error: err instanceof Error ? err.message : String(err) },
          { status: 500 }
        );
      }
    },
  },
});
