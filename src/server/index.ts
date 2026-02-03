import { serve } from 'bun';
import { getRoutes } from './routes';
import { logger } from './lib/logger';

const server = serve({
  routes: getRoutes(),

  development: process.env.NODE_ENV !== 'production' && {
    hmr: true,
    console: true,
  },
});

logger.info(`🚀 Server running at ${server.url}`);
