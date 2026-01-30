import { router } from "./router";
import { putObject, getObjectBuffer, deleteObject } from "../lib/storage";

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
});
