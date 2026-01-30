/**
 * Single source of truth for DB schema.
 * Better Auth tables live in auth.schema.ts (generated/updated by Better Auth CLI).
 * Domain tables (N2W) live in domain.schema.ts.
 */
export * from "./auth.schema";
export * from "./domain.schema";

import * as authSchema from "./auth.schema";
import * as domainSchema from "./domain.schema";

/** Combined schema for Drizzle client (auth + domain). Better Auth uses auth.schema directly. */
export const schema = { ...authSchema, ...domainSchema };
