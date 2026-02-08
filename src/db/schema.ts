/**
 * Single source of truth for DB schema.
 * Domain tables (N2W) live in domain.schema.ts.
 */
export * from './domain.schema';

import * as domainSchema from './domain.schema';

/** Combined schema for Drizzle client. */
export const schema = { ...domainSchema };
