import index from "../../client/index.html";
import { authRoutes } from "./auth";
import { meRoutes } from "./me";
import { dbRoutes } from "./db";
import { helloRoutes } from "./hello";

export function getRoutes() {
  return {
    ...authRoutes,
    ...meRoutes,
    ...dbRoutes,
    ...helloRoutes,
    "/*": index,
  };
}
