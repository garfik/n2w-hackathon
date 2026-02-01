import { router } from "./router";
import { requireUser } from "../lib/requireUser";
import { db } from "../../db/client";
import { avatar } from "../../db/domain.schema";
import { putObject } from "../lib/storage";

export const avatarsRoutes = router({
  "/api/avatars": {
    async POST(req) {
      const result = await requireUser(req);
      if (!result.ok) return result.response;

      const contentType = req.headers.get("content-type") ?? "";
      if (!contentType.includes("multipart/form-data")) {
        return Response.json({ error: "Expected multipart/form-data" }, { status: 400 });
      }

      const formData = await req.formData();
      const file = formData.get("file") ?? formData.get("image");
      if (!file || !(file instanceof File)) {
        return Response.json({ error: "Missing file or image" }, { status: 400 });
      }

      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const id = crypto.randomUUID();
      const key = `avatars/${result.userId}/${id}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const mime = file.type || (ext === "png" ? "image/png" : "image/jpeg");
      await putObject(key, buffer, mime);

      const name = (formData.get("name") as string) || file.name || "Avatar";
      await db.insert(avatar).values({
        id,
        userId: result.userId,
        name,
        sourcePhotoKey: key,
      });

      return Response.json({ ok: true, id });
    },
  },
});
