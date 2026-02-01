import { router } from "./router";
import { requireUser } from "../lib/requireUser";
import { db } from "../../db/client";
import { avatar } from "../../db/domain.schema";
import { eq, count } from "drizzle-orm";

export const appRoutes = router({
  "/api/app/bootstrap": {
    async GET(req) {
      const result = await requireUser(req);
      if (!result.ok) return result.response;

      const [row] = await db
        .select({ count: count() })
        .from(avatar)
        .where(eq(avatar.userId, result.userId));

      const avatarExists = (row?.count ?? 0) > 0;

      return Response.json({
        ok: true,
        avatarExists,
      });
    },
  },
});
