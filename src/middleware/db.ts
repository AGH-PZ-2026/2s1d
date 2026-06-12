import { createMiddleware } from 'hono/factory';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import type { Pool, Connection } from 'mysql2/promise';
import { createDb, type DbEnv } from '../db/client';

/**
 * `rawDb` is the mysql2 object that supports `execute(sql, params)` and
 * returns `[rows, fields]`. Both Pool and Connection satisfy this; on
 * Cloudflare we expose the underlying Hyperdrive connection, on Node we
 * expose the singleton pool.
 */
type RawDb = Pool | Connection;

type Variables = {
  db: MySql2Database<Record<string, never>>;
  rawDb: RawDb;
};

export const dbMiddleware = createMiddleware<{
  Variables: Variables;
  Bindings: DbEnv & Env;
}>(async (c, next) => {
  const conn = await createDb(c.env);
  c.set('db', conn);
  // Expose the underlying mysql2 client for raw SQL queries.
  // - On Cloudflare: the Hyperdrive connection (single conn per request)
  // - On Node: the singleton pool
  const session = (conn as unknown as { session?: { client?: RawDb } }).session;
  const raw: RawDb | undefined = session?.client;
  if (!raw) {
    throw new Error('Failed to obtain raw DB client from Drizzle session');
  }
  c.set('rawDb', raw);
  await next();
});
