import { serve } from 'bun';
import { getRoutes } from './routes';
import { logger } from './lib/logger';
import { runMigrations } from './lib/runMigrations';

async function main() {
  if (process.env.RUN_MIGRATIONS_ON_START === '1') {
    await runMigrations();
  }

  const port = process.env.PORT ? Number(process.env.PORT) : 7001;
  const server = serve({
    port,
    hostname: '0.0.0.0',
    routes: getRoutes(),

    development: process.env.NODE_ENV !== 'production' && {
      hmr: true,
      console: true,
    },
  });

  logger.info(`🚀 Server running at ${server.url}`);
}

main();
