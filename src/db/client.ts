import { drizzle } from 'drizzle-orm/mysql2';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import mysql, { type Pool } from 'mysql2/promise';

/**
 * Connection parameters understood by both Cloudflare Hyperdrive and a plain
 * Node.js mysql2 connection.
 */
export interface DbConnectionParams {
  host: string;
  user: string;
  password: string;
  database: string;
  port: number;
}

/**
 * Subset of env bindings used to create a DB connection.
 * - `HYPERDRIVE` is the Cloudflare Workers binding
 * - `DATABASE_URL` is the standard self-hosted config (e.g. mysql://user:pass@host:3306/db)
 * - The `MYSQL_*` vars mirror docker-compose/.env and act as a fallback
 */
export interface DbEnv {
  HYPERDRIVE?: Hyperdrive | undefined;
  DATABASE_URL?: string | undefined;
  MYSQL_HOST?: string | undefined;
  MYSQL_PORT?: string | undefined;
  MYSQL_USER?: string | undefined;
  MYSQL_PASSWORD?: string | undefined;
  MYSQL_DATABASE?: string | undefined;
}

function fromHyperdrive(hd: Hyperdrive): DbConnectionParams {
  return {
    host: hd.host,
    user: hd.user,
    password: hd.password,
    database: hd.database,
    port: hd.port,
  };
}

function fromDatabaseUrl(url: string): DbConnectionParams {
  const u = new URL(url);
  if (u.protocol !== 'mysql:' && u.protocol !== 'mysql2:') {
    throw new Error(`Unsupported DATABASE_URL protocol: ${u.protocol}`);
  }
  const dbName = u.pathname.replace(/^\//, '');
  if (!dbName) throw new Error('DATABASE_URL must include a database name');
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: dbName,
  };
}

function fromMysqlEnv(env: DbEnv): DbConnectionParams {
  const host = env.MYSQL_HOST;
  const user = env.MYSQL_USER;
  const password = env.MYSQL_PASSWORD ?? '';
  const database = env.MYSQL_DATABASE;
  if (!host || !user || !database) {
    throw new Error(
      'Missing MySQL connection config. Provide DATABASE_URL or MYSQL_HOST/MYSQL_USER/MYSQL_DATABASE env vars.'
    );
  }
  return {
    host,
    user,
    password,
    database,
    port: env.MYSQL_PORT ? Number(env.MYSQL_PORT) : 3306,
  };
}

/**
 * Resolve DB connection params from any of the supported env sources.
 * Cloudflare Hyperdrive binding takes priority (it pools at the edge).
 */
export function resolveDbParams(env: DbEnv): DbConnectionParams {
  if (env.HYPERDRIVE) return fromHyperdrive(env.HYPERDRIVE);
  if (env.DATABASE_URL) return fromDatabaseUrl(env.DATABASE_URL);
  return fromMysqlEnv(env);
}

// Module-level cache for the Node.js pool. Cloudflare Workers reset
// module state on every request, so this is a no-op there.
let _nodePool: Pool | null = null;
let _nodePoolKey: string | null = null;

function poolKey(params: DbConnectionParams): string {
  return `${params.user}@${params.host}:${params.port}/${params.database}`;
}

/**
 * Create a Drizzle DB instance. The behaviour differs by runtime:
 * - On Cloudflare (HYPERDRIVE binding present): opens a single connection
 *   per request. Workers are short-lived so this is the right granularity.
 * - On a self-hosted Node.js server: reuses a singleton pool so requests
 *   share TCP connections.
 */
export async function createDb(
  env: DbEnv
): Promise<MySql2Database<Record<string, never>>> {
  const params = resolveDbParams(env);

  if (env.HYPERDRIVE) {
    // Cloudflare Workers: one connection per invocation
    const connection = await mysql.createConnection({
      host: params.host,
      user: params.user,
      password: params.password,
      database: params.database,
      port: params.port,
      disableEval: true,
      charset: 'utf8mb4',
    });
    return drizzle(connection);
  }

  // Self-hosted Node.js: use a singleton pool
  const key = poolKey(params);
  if (!_nodePool || _nodePoolKey !== key) {
    if (_nodePool) {
      try {
        await _nodePool.end();
      } catch {
        /* ignore */
      }
    }
    _nodePool = mysql.createPool({
      host: params.host,
      user: params.user,
      password: params.password,
      database: params.database,
      port: params.port,
      connectionLimit: 10,
      waitForConnections: true,
      charset: 'utf8mb4',
      enableKeepAlive: true,
    });
    _nodePoolKey = key;
  }
  return drizzle(_nodePool);
}

/**
 * Close the cached pool. Call this during graceful shutdown.
 */
export async function closeDb(): Promise<void> {
  if (_nodePool) {
    try {
      await _nodePool.end();
    } catch {
      /* ignore */
    }
    _nodePool = null;
    _nodePoolKey = null;
  }
}
