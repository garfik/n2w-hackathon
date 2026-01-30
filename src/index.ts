import { serve } from "bun";
import index from "./index.html";
import { db } from "./db/client";
import { sql } from "drizzle-orm";
import { auth } from "./auth";
import { requireUser } from "./lib/requireUser";

const server = serve({
  routes: {
    // Auth routes must be declared before "/*" so they are not caught by index.html
    "/api/auth/*": {
      GET: (req) => auth.handler(req),
      POST: (req) => auth.handler(req),
      PATCH: (req) => auth.handler(req),
      PUT: (req) => auth.handler(req),
      DELETE: (req) => auth.handler(req),
    },

    "/api/me": {
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

    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/db/ping": {
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

    "/api/hello": {
      async GET(req) {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      },
      async PUT(req) {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      },
    },

    "/api/hello/:name": async req => {
      const name = req.params.name;
      return Response.json({
        message: `Hello, ${name}!`,
      });
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
