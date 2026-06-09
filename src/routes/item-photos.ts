import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { itemPhotos, type ItemPhoto } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { notFound, badRequest } from "../lib/errors";

type Variables = { db: MySql2Database<Record<string, never>>; userId: number; userRole: "admin" | "user"; isAuthenticated: boolean };
const router = new Hono<{ Variables: Variables; Bindings: Env }>();
router.use("/*", authMiddleware);

function toResponse(p: ItemPhoto) {
  return { id: p.id, itemId: p.itemId, uploadedById: p.uploadedById, originalFilename: p.originalFilename, contentType: p.contentType, storagePath: p.storagePath, addedAt: p.addedAt };
}

// Nested under items: /api/v1/items/:itemId/photos
router.get("/:itemId/photos", async (c) => {
  const db = c.get("db"); const itemId = Number(c.req.param("itemId"));
  const rows = await db.select().from(itemPhotos).where(eq(itemPhotos.itemId, itemId)).orderBy(desc(itemPhotos.addedAt));
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
  const created = await db.select().from(itemPhotos).where(eq(itemPhotos.id, result[0].insertId)).limit(1);
  return c.json(toResponse(created[0]), 201);
});

export { router as itemPhotosRouter };
