import path from 'path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from '@db/client';
import { logger } from './logger';

export async function runMigrations(): Promise<void> {
  const migrationsFolder = path.join(process.cwd(), 'drizzle');
  const log = logger.child({ module: 'migrations' });
  log.info('Running migrations...');
  try {
    await migrate(db, { migrationsFolder });
    log.info('Migrations completed');
  } catch (err) {
    log.error({ err }, 'Migrations failed');
    throw err;
  }
}
