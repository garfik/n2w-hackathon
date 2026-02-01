import index from "../../client/index.html";
import { authRoutes } from "./auth";
import { meRoutes } from "./me";
import { appRoutes } from "./app";
import { dbRoutes } from "./db";
import { helloRoutes } from "./hello";
import { storageRoutes } from "./storage";
import { geminiRoutes } from "./gemini";

export function getRoutes() {
  return {
    ...authRoutes,
    ...meRoutes,
    ...appRoutes,
    ...dbRoutes,
    ...helloRoutes,
    ...storageRoutes,
    ...geminiRoutes,
    "/*": index,
  };
}
