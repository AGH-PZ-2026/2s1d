/**
 * Self-hosted Node.js entrypoint.
 *
 * The Hono app in `src/index.ts` is runtime-agnostic — the same code can
 * run on Cloudflare Workers and on a plain Node.js server. This file
 * provides the Node-specific bootstrap:
 *   1. Create the photos directory
 *   2. Serve the built SPA from `dist/client/` (or whatever STATIC_DIR says)
 *   3. Run the Hono app on `@hono/node-server`
 *
 * Run with:
 *   pnpm run build && pnpm start
 * or
 *   pnpm run start:dev   (tsx, no bundle step)
 *   pnpm run dev:server  (tsx watch — also rebuilds the client first)
 */
import { existsSync, statSync } from 'node:fs';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import type { Context, MiddlewareHandler } from 'hono';
import app from './index';
import { closeDb, resolveDbParams } from './db/client';
import { runMigrations } from './db/migrate';
import mysql from 'mysql2/promise';

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? '0.0.0.0';
const STATIC_DIR = (
  process.env.STATIC_DIR ?? resolve(process.cwd(), 'dist/client')
).replace(/\/$/, '');
const STORAGE_DIR =
  process.env.PHOTOS_LOCAL_DIR ?? resolve(process.cwd(), 'storage');
process.env.PHOTOS_LOCAL_DIR = STORAGE_DIR;
await mkdir(STORAGE_DIR, { recursive: true });

// Run database migrations + seed before accepting requests
const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR ?? resolve(process.cwd(), 'src/db/migrations');
if (existsSync(MIGRATIONS_DIR)) {
  const params = resolveDbParams(process.env as unknown as import('./db/client').DbEnv);
  const migratePool = mysql.createPool({
    host: params.host,
    port: params.port,
    user: params.user,
    password: params.password,
    database: params.database,
    waitForConnections: true,
    connectionLimit: 2,
  });
  try {
    await runMigrations(migratePool, MIGRATIONS_DIR);
  } finally {
    await migratePool.end();
  }
}

if (!existsSync(STATIC_DIR)) {
  // eslint-disable-next-line no-console
  console.warn(
    `[pz-worker] WARNING: static dir not found at ${STATIC_DIR} — run \`pnpm run build:client\` first.`
  );
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

/**
 * Paths that should never be served as static files — they're handled
 * by the Hono app mounted at "/". The wrangler config achieves the same
 * separation in Cloudflare Workers via `run_worker_first: ["/api/*"]`.
 */
const API_PREFIXES = ['/api/', '/storage/'];

function isApiPath(pathname: string): boolean {
  return API_PREFIXES.some(
    (p) => pathname === p.slice(0, -1) || pathname.startsWith(p)
  );
}

async function tryServeFile(pathname: string, c: Context) {
  if (pathname.includes('..')) return null;
  const requested = normalize(join(STATIC_DIR, pathname));
  if (!requested.startsWith(STATIC_DIR + sep) && requested !== STATIC_DIR)
    return null;
  if (existsSync(requested) && statSync(requested).isFile()) {
    const data = await readFile(requested);
    return c.body(data as unknown as ArrayBuffer, 200, {
      'Content-Type':
        MIME[extname(requested).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=300',
    });
  }
  return null;
}

async function serveSpa(c: Context) {
  const indexPath = join(STATIC_DIR, 'index.html');
  if (!existsSync(indexPath)) return c.notFound();
  const data = await readFile(indexPath);
  return c.body(data as unknown as ArrayBuffer, 200, {
    'Content-Type': MIME['.html'],
    'Cache-Control': 'no-cache',
  });
}

const staticMiddleware: MiddlewareHandler = async (c, next) => {
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD') return next();
  const url = new URL(c.req.url);
  let pathname: string;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return next();
  }
  if (isApiPath(pathname)) return next();

  const fileResp = await tryServeFile(pathname, c);
  if (fileResp) return fileResp;

  if (!extname(pathname)) return serveSpa(c);
  return next();
};

const composed = new Hono<{ Bindings: Env }>({ strict: false });
composed.use('*', staticMiddleware);
composed.route('/', app);

/**
 * When the inner `app` doesn't match a request, the parent's notFound
 * fires (Hono's behaviour with mounted sub-apps). Provide a parent
 * notFound that returns the same JSON shape as the inner one for API
 * paths, and serves the SPA for everything else.
 */
composed.notFound(async (c) => {
  if (isApiPath(new URL(c.req.url).pathname)) {
    return c.json({ detail: 'Not found' }, 404);
  }
  return serveSpa(c);
});

/**
 * Pass `process.env` to the Hono app as its `Bindings` so route handlers
 * that read `c.env.JWT_SECRET`, `c.env.DATABASE_URL`, etc. see the same
 * values that the Cloudflare Workers binding system would inject.
 */
const fetch = (request: Request, _bindings: unknown) =>
  composed.fetch(request, process.env as unknown as Env);

const server = serve({ fetch, port: PORT, hostname: HOST }, (info) => {
  // eslint-disable-next-line no-console
  console.log(
    `[pz-worker] listening on http://${info.address}:${info.port} (static=${STATIC_DIR}, storage=${STORAGE_DIR})`
  );
});

const shutdown = async (signal: string) => {
  // eslint-disable-next-line no-console
  console.log(`[pz-worker] received ${signal}, shutting down...`);
  server.close();
  await closeDb();
  process.exit(0);
};
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
