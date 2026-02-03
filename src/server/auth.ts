import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@db/client';
import * as schema from '@db/auth.schema';
import { logger } from './lib/logger';

const authLog = logger.child({ module: 'auth' });

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  emailAndPassword: { enabled: true },
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BUN_PUBLIC_BETTER_AUTH_URL!,
  logger: {
    disabled: false,
    disableColors: false,
    level: 'warn',
    log: (level, message, ...args) => {
      const payload = args.length ? { args } : undefined;
      if (level === 'error') authLog.error(payload, message);
      else if (level === 'warn') authLog.warn(payload, message);
      else authLog.info(payload, message);
    },
  },
});
