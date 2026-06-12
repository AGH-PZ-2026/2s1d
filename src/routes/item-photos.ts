import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { itemPhotos, type ItemPhoto } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { notFound, badRequest } from '../lib/errors';
import { createObjectStorage, type ObjectStorage } from '../lib/storage';

type Variables = {
  db: MySql2Database<Record<string, never>>;
  userId: number;
  userRole: 'admin' | 'user';
  isAuthenticated: boolean;
  storage: ObjectStorage;
};

const router = new Hono<{ Variables: Variables; Bindings: Env }>();
router.use('/*', authMiddleware);

/** Attach the per-request storage adapter. */
router.use('/*', async (c, next) => {
  c.set('storage', createObjectStorage(c.env));
  await next();
});

function toResponse(p: ItemPhoto) {
  return {
    id: p.id,
    itemId: p.itemId,
    uploadedById: p.uploadedById,
    originalFilename: p.originalFilename,
    contentType: p.contentType,
    storagePath: p.storagePath,
    addedAt: p.addedAt,
  };
}

// GET /api/v1/items/:itemId/photos
router.get('/:itemId/photos', async (c) => {
  const db = c.get('db');
  const itemId = Number(c.req.param('itemId'));
  const rows = await db
    .select()
    .from(itemPhotos)
    .where(eq(itemPhotos.itemId, itemId))
    .orderBy(desc(itemPhotos.addedAt));
  const storage = c.get('storage');
  return c.json(
    rows.map((p) => ({
      ...toResponse(p),
      url: storage.publicUrl(p.storagePath),
    }))
  );
});

// POST /api/v1/items/:itemId/photos  (multipart/form-data, field "file")
router.post('/:itemId/photos', async (c) => {
  const db = c.get('db');
  const storage = c.get('storage');
  const itemId = Number(c.req.param('itemId'));
  const userId = c.get('userId');
  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  if (!file) badRequest('No file uploaded');

  const ext =
    (file.name.split('.').pop() || 'bin')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') || 'bin';
  const storagePath = `items/${itemId}/${crypto.randomUUID()}.${ext}`;
  const contentType = file.type || 'application/octet-stream';
  await storage.put(
    storagePath,
    file.stream() as unknown as ReadableStream<Uint8Array>,
    { contentType }
  );

  const result = await db.insert(itemPhotos).values({
    itemId,
    uploadedById: userId,
    originalFilename: file.name,
    contentType,
    storagePath,
  });
  const created = await db
    .select()
    .from(itemPhotos)
    .where(eq(itemPhotos.id, result[0].insertId))
    .limit(1);
  return c.json(
    {
      ...toResponse(created[0]),
      url: storage.publicUrl(created[0].storagePath),
    },
    201
  );
});

// GET /api/v1/items/:itemId/photos/:photoId/file  — stream the raw photo bytes
router.get('/:itemId/photos/:photoId/file', async (c) => {
  const db = c.get('db');
  const storage = c.get('storage');
  const itemId = Number(c.req.param('itemId'));
  const photoId = Number(c.req.param('photoId'));
  const rows = await db
    .select()
    .from(itemPhotos)
    .where(and(eq(itemPhotos.id, photoId), eq(itemPhotos.itemId, itemId)))
    .limit(1);
  if (rows.length === 0) notFound('Photo not found');
  const photo = rows[0];
  const bytes = await storage.getBytes(photo.storagePath);
  if (!bytes) notFound('Photo file missing in storage');
  return new Response(bytes.body as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': bytes.contentType,
      'Cache-Control': 'private, max-age=3600',
    },
  });
});

// DELETE /api/v1/items/:itemId/photos/:photoId
router.delete('/:itemId/photos/:photoId', async (c) => {
  const db = c.get('db');
  const storage = c.get('storage');
  const itemId = Number(c.req.param('itemId'));
  const photoId = Number(c.req.param('photoId'));
  const rows = await db
    .select()
    .from(itemPhotos)
    .where(and(eq(itemPhotos.id, photoId), eq(itemPhotos.itemId, itemId)))
    .limit(1);
  if (rows.length === 0) notFound('Photo not found');
  await db.delete(itemPhotos).where(eq(itemPhotos.id, photoId));
  await storage.delete(rows[0].storagePath);
  return c.json({ ok: true });
});

export { router as itemPhotosRouter };
