import { router } from "./router";
import { putObject, getObjectBuffer, deleteObject } from "../lib/storage";
import { requireUser } from "../lib/requireUser";

export const storageRoutes = router({
  "/api/storage/ping": {
    async GET() {
      try {
        const key = `__ping/${Date.now()}.txt`;
        await putObject(key, Buffer.from("ok"), "text/plain");
        const buf = await getObjectBuffer(key);
        await deleteObject(key);
        return Response.json({ ok: true, value: buf.toString("utf8") });
      } catch (err) {
        return Response.json(
          { ok: false, error: err instanceof Error ? err.message : String(err) },
          { status: 500 }
        );
      }
    },
  },

  "/api/storage/object": {
    async GET(req) {
      const result = await requireUser(req);
      if (!result.ok) return result.response;
      const url = new URL(req.url);
      const key = url.searchParams.get("key");
      if (!key || key.includes("..")) {
        return Response.json({ error: "Missing or invalid key" }, { status: 400 });
      }
      if (!key.startsWith(`avatars/${result.userId}/`) && !key.startsWith(`garments/${result.userId}/`)) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
      try {
        const buf = await getObjectBuffer(key);
        const contentType = key.endsWith(".png") ? "image/png" : key.endsWith(".webp") ? "image/webp" : "image/jpeg";
        return new Response(new Uint8Array(buf), {
          headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=3600" },
        });
      } catch {
        return Response.json({ error: "Not found" }, { status: 404 });
      }
    },
  },
});
