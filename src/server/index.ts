import { serve } from "bun";
import { getRoutes } from "./routes";

const server = serve({
  routes: getRoutes(),

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
