import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { itemPhotos, type ItemPhoto, users } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { notFound, badRequest } from "../lib/errors";
import { createAuditLog } from "../lib/audit";

type Variables = { db: MySql2Database<Record<string, never>>; userId: number; userRole: "admin" | "user"; isAuthenticated: boolean };
const router = new Hono<{ Variables: Variables; Bindings: Env }>();
router.use("/*", authMiddleware);

function toResponse(p: any) {
  return { id: p.id, itemId: p.itemId, uploadedById: p.uploadedById, uploadedByName: p.uploadedByName, originalFilename: p.originalFilename, contentType: p.contentType, storagePath: p.storagePath, addedAt: p.addedAt };
}

// Nested under items: /api/v1/items/:itemId/photos
router.get("/:itemId/photos", async (c) => {
  const db = c.get("db"); const itemId = Number(c.req.param("itemId"));
  const rows = await db.select({
    id: itemPhotos.id, itemId: itemPhotos.itemId, uploadedById: itemPhotos.uploadedById,
    originalFilename: itemPhotos.originalFilename, contentType: itemPhotos.contentType,
    storagePath: itemPhotos.storagePath, addedAt: itemPhotos.addedAt,
    uploadedByName: users.email
  }).from(itemPhotos)
  .leftJoin(users, eq(itemPhotos.uploadedById, users.id))
  .where(eq(itemPhotos.itemId, itemId)).orderBy(desc(itemPhotos.addedAt));
  return c.json(rows.map(toResponse));
});

router.post("/:itemId/photos", async (c) => {
  const db = c.get("db"); const bucket = c.env.PHOTOS_BUCKET;
  const itemId = Number(c.req.param("itemId")); const userId = c.get("userId");
  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;
  if (!file) badRequest("No file uploaded");

  const ext = file.name.split(".").pop() ?? "bin";
  const storagePath = `items/${itemId}/${crypto.randomUUID()}.${ext}`;
  await bucket.put(storagePath, file.stream(), { httpMetadata: { contentType: file.type || "application/octet-stream" } });

  const result = await db.insert(itemPhotos).values({ itemId, uploadedById: userId, originalFilename: file.name, contentType: file.type || "application/octet-stream", storagePath });
  const created = await db.select({
    id: itemPhotos.id, itemId: itemPhotos.itemId, uploadedById: itemPhotos.uploadedById,
    originalFilename: itemPhotos.originalFilename, contentType: itemPhotos.contentType,
    storagePath: itemPhotos.storagePath, addedAt: itemPhotos.addedAt,
    uploadedByName: users.email
  }).from(itemPhotos)
  .leftJoin(users, eq(itemPhotos.uploadedById, users.id))
  .where(eq(itemPhotos.id, result[0].insertId)).limit(1);

  await createAuditLog(db, {
  userId,
  itemId,
  action: "PHOTO_ADDED",
  newValue: {
    photoId: created[0].id,
    filename: created[0].originalFilename,
    contentType: created[0].contentType,
    uploadedBy: created[0].uploadedByName,
    addedAt: created[0].addedAt,
  },
});

  return c.json(toResponse(created[0]), 201);
});

router.get("/:itemId/photos/:photoId", async (c) => {
  const db = c.get("db"); const bucket = c.env.PHOTOS_BUCKET;
  const itemId = Number(c.req.param("itemId")); const photoId = Number(c.req.param("photoId"));
  const rows = await db.select().from(itemPhotos).where(eq(itemPhotos.id, photoId)).limit(1);
  if (rows.length === 0 || rows[0].itemId !== itemId) notFound("Photo not found");
  const photo = rows[0];
  const object = await bucket.get(photo.storagePath);
  if (!object) notFound("Photo file missing in storage");
  return new Response(object.body as ReadableStream, {
    headers: { "Content-Type": photo.contentType, "Cache-Control": "public, max-age=31536000" }
  });
});

export { router as itemPhotosRouter };
