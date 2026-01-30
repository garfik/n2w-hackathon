import { router } from "./router";

export const helloRoutes = router({
  "/api/hello": {
    async GET(_req) {
      return Response.json({
        message: "Hello, world!",
        method: "GET",
      });
    },
    async PUT(_req) {
      return Response.json({
        message: "Hello, world!",
        method: "PUT",
      });
    },
  },

  "/api/hello/:name": async (req) => {
    const { name } = req.params;
    return Response.json({
      message: `Hello, ${name}!`,
    });
  },
});
