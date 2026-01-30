import { router } from "./router";
import { auth } from "../auth";

export const authRoutes = router({
  "/api/auth/*": {
    GET: (req) => auth.handler(req),
    POST: (req) => auth.handler(req),
    PATCH: (req) => auth.handler(req),
    PUT: (req) => auth.handler(req),
    DELETE: (req) => auth.handler(req),
  },
});
