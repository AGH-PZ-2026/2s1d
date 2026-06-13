import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, like, or, and, desc, sql } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { items, type Item } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { notFound, badRequest, forbidden } from "../lib/errors";

type Variables = {
  db: MySql2Database<Record<string, never>>;
  userId: number;
  userRole: "admin" | "user";
  isAuthenticated: boolean;
};

const router = new Hono<{ Variables: Variables; Bindings: Env }>();
router.use("/*", authMiddleware);

const createSchema = z.object({
  name: z.string().min(1).max(100),
  manufacturer: z.string().max(100).optional().default(""),
  model: z.string().max(100).optional(),
  serial: z.string().max(100).optional(),
  inventoryNumber: z.string().max(100).optional(),
  description: z.string().optional(),
  purchaseDate: z.string().optional(),
  systemId: z.string().max(32).optional(),
  categoryId: z.number().int().positive().optional(),
  statusId: z.number().int().positive().optional(),
  locationId: z.number().int().positive().optional(),
  ownerId: z.number().int().positive().optional(),
  ownerGroupId: z.number().int().positive().optional(),
});

const updateSchema = createSchema.partial();

function toResponse(item: Item) {
  return {
    id: item.id,
    systemId: item.systemId,
    name: item.name,
    manufacturer: item.manufacturer,
    model: item.model,
    serial: item.serial,
    inventoryNumber: item.inventoryNumber,
    description: item.description,
    purchaseDate: item.purchaseDate,
    addedAt: item.addedAt,
    categoryId: item.categoryId,
    statusId: item.statusId,
    locationId: item.locationId,
    ownerId: item.ownerId,
    ownerGroupId: item.ownerGroupId,
    legacyItemId: item.legacyItemId,
  };
}

router.get("/", async (c) => {
  const db = c.get("db");
  const search = c.req.query("search");
  const statusId = c.req.query("statusId");
  const locationId = c.req.query("locationId");
  const conditions = [];
  if (search) {
    conditions.push(
      or(
        like(items.name, `%${search}%`),
        like(items.manufacturer, `%${search}%`),
        like(items.model, `%${search}%`),
        like(items.serial, `%${search}%`),
        like(items.inventoryNumber, `%${search}%`),
        like(items.systemId, `%${search}%`)
      )
    );
  }
  if (statusId) conditions.push(eq(items.statusId, Number(statusId)));
  if (locationId) conditions.push(eq(items.locationId, Number(locationId)));
  const rows = await db.select().from(items).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(desc(items.id));
  return c.json(rows.map(toResponse));
});

router.get("/:id", async (c) => {
  const db = c.get("db");
  const id = Number(c.req.param("id"));
  const rows = await db.select().from(items).where(eq(items.id, id)).limit(1);
  if (rows.length === 0) notFound("Item not found");
  return c.json(toResponse(rows[0]));
});

router.post("/", zValidator("json", createSchema), async (c) => {
  const db = c.get("db");
  const body = c.req.valid("json");
  if (!body.name.trim()) badRequest("Nazwa przedmiotu jest wymagana.");

  const insertValues: Record<string, unknown> = {
    name: body.name,
    manufacturer: body.manufacturer || null,
    model: body.model ?? null,
    serial: body.serial ?? null,
    inventoryNumber: body.inventoryNumber ?? null,
    description: body.description ?? null,
    addedAt: sql`NOW()`,
    categoryId: body.categoryId ?? null,
    statusId: body.statusId ?? null,
    locationId: body.locationId ?? null,
    ownerId: body.ownerId ?? null,
    ownerGroupId: body.ownerGroupId ?? null,
  };
  if (body.systemId) insertValues.systemId = body.systemId;
  if (body.purchaseDate) insertValues.purchaseDate = body.purchaseDate;

  const result = await db.insert(items).values(insertValues as typeof items.$inferInsert);

  const created = await db.select().from(items).where(eq(items.id, result[0].insertId)).limit(1);
  return c.json(toResponse(created[0]), 201);
});

router.patch("/:id", zValidator("json", updateSchema), async (c) => {
  const db = c.get("db");
  const id = Number(c.req.param("id"));
  const existing = await db.select().from(items).where(eq(items.id, id)).limit(1);
  if (existing.length === 0) notFound("Item not found");

  const body = c.req.valid("json");
  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.manufacturer !== undefined) updateData.manufacturer = body.manufacturer || null;
  if (body.model !== undefined) updateData.model = body.model ?? null;
  if (body.serial !== undefined) updateData.serial = body.serial ?? null;
  if (body.inventoryNumber !== undefined) updateData.inventoryNumber = body.inventoryNumber ?? null;
  if (body.description !== undefined) updateData.description = body.description ?? null;
  if (body.purchaseDate !== undefined) updateData.purchaseDate = body.purchaseDate ?? null;
  if (body.systemId !== undefined) updateData.systemId = body.systemId ?? null;
  if (body.categoryId !== undefined) updateData.categoryId = body.categoryId ?? null;
  if (body.statusId !== undefined) updateData.statusId = body.statusId ?? null;
  if (body.locationId !== undefined) updateData.locationId = body.locationId ?? null;
  if (body.ownerId !== undefined) updateData.ownerId = body.ownerId ?? null;
  if (body.ownerGroupId !== undefined) updateData.ownerGroupId = body.ownerGroupId ?? null;
  if (Object.keys(updateData).length === 0) badRequest("No fields to update");

  await db.update(items).set(updateData).where(eq(items.id, id));
  const updated = await db.select().from(items).where(eq(items.id, id)).limit(1);
  return c.json(toResponse(updated[0]));
});

router.delete("/:id", async (c) => {
  const db = c.get("db");
  const id = Number(c.req.param("id"));
  if (c.get("userRole") !== "admin") forbidden("Only admins can delete items");
  const existing = await db.select().from(items).where(eq(items.id, id)).limit(1);
  if (existing.length === 0) notFound("Item not found");
  await db.delete(items).where(eq(items.id, id));
  return c.body(null, 204);
});

export { router as itemsRouter };
