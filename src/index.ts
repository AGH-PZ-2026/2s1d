import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { sql } from 'drizzle-orm';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { dbMiddleware } from './middleware/db';
import { autoMigrateMiddleware } from './middleware/auto-migrate';
import { authRouter } from './routes/auth';
import { statusesRouter } from './routes/statuses';
import { categoriesRouter } from './routes/categories';
import { itemsRouter } from './routes/items';
import { locationsRouter } from './routes/locations';
import { borrowingsRouter } from './routes/borrowings';
import { delegationsRouter } from './routes/delegations';
import { globalDelegationsRouter } from './routes/global-delegations';
import { groupsRouter } from './routes/groups';
import { usersRouter } from './routes/users';
import { qrCodesRouter } from './routes/qr-codes';
import { batchQrRouter } from './routes/batch-qr';
import { quickActionRouter } from './routes/quick-action';
import { excelImportRouter } from './routes/excel-import';
import { itemPhotosRouter } from './routes/item-photos';
import { notificationsRouter } from './routes/notifications';
import { auditLogsRouter } from './routes/audit-logs';
import { staffRouter } from './routes/staff';
import { storageProxyApp } from './lib/storageProxy';

type AppVariables = {
  db: MySql2Database<Record<string, never>>;
  rawDb: unknown;
};

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>({
  strict: false,
});

app.use('*', cors());
app.use('/api/*', dbMiddleware);
app.use('/api/*', autoMigrateMiddleware);

app.route('/api/v1/auth', authRouter);
app.route('/api/v1/item-status', statusesRouter);
app.route('/api/v1/categories', categoriesRouter);
app.route('/api/v1/locations', locationsRouter);
app.route('/api/v1/borrowings', borrowingsRouter);
app.route('/api/v1/groups', groupsRouter);
app.route('/api/v1/users', usersRouter);
app.route('/api/v1/qr-codes', qrCodesRouter);
app.route('/api/v1/batch-qr', batchQrRouter);
app.route('/api/v1/quick-actions', quickActionRouter);
app.route('/api/v1/excel', excelImportRouter);
app.route('/api/v1/notifications', notificationsRouter);
app.route('/api/v1/audit-logs', auditLogsRouter);
app.route('/api/v1/staff', staffRouter);
app.route('/api/v1/delegations', globalDelegationsRouter);
// Mount nested routers BEFORE generic items router
app.route('/api/v1/items', delegationsRouter);
app.route('/api/v1/items', itemPhotosRouter);
app.route('/api/v1/items', itemsRouter);

// Self-hosted storage proxy: GET /storage/<key>  → file bytes
// On Cloudflare we don't need this (the R2 binding or a custom domain
// serves files directly). On Node, the storage adapter returns
// `/storage/...` as its publicUrl by default, and this router serves them.
app.route('/storage', storageProxyApp);

app.get('/api/health', async (c) => {
  let dbStatus: 'ok' | 'error' = 'error';
  try {
    const db = c.get('db');
    await db.execute(sql`SELECT 1`);
    dbStatus = 'ok';
  } catch {
    dbStatus = 'error';
  }
  return c.json({
    status: dbStatus === 'ok' ? 'ok' : 'degraded',
    database: dbStatus,
  });
});

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json(
      { detail: err.message },
      err.status as 400 | 401 | 403 | 404 | 500
    );
  }
  console.error(
    JSON.stringify({
      message: 'unhandled error',
      error: err instanceof Error ? err.message : String(err),
    })
  );
  return c.json({ detail: 'Internal server error' }, 500);
});

app.notFound((c) => c.json({ detail: 'Not found' }, 404));

export default app;
