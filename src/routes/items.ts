import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, like, or, and, desc, sql } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { items, type Item } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { notFound, badRequest, forbidden } from "../lib/errors";
import { getItemPermissionLevel } from "../lib/permissions";
import { createAuditLog } from "../lib/audit";

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
  const insertedId = result[0].insertId;

  if (!body.systemId) {
    const generatedSystemId = `INV-${String(insertedId).padStart(6, '0')}`;
    await db.update(items).set({ systemId: generatedSystemId }).where(eq(items.id, insertedId));
  }

  const created = await db.select().from(items).where(eq(items.id, insertedId)).limit(1);
  
  await createAuditLog(db, {
    userId: c.get("userId"),
    itemId: insertedId,
    action: "ITEM_CREATED",
    newValue: created[0],
  });

  return c.json(toResponse(created[0]), 201);
});

router.patch("/:id", zValidator("json", updateSchema), async (c) => {
  const db = c.get("db");
  const id = Number(c.req.param("id"));
  const existing = await db.select().from(items).where(eq(items.id, id)).limit(1);
  if (existing.length === 0) notFound("Item not found");
  
  const item = existing[0];
  const permission = await getItemPermissionLevel(db, id, c.get("userId"), c.get("userRole"), item.ownerId);
  if (!permission) forbidden("Brak uprawnień do edycji tego przedmiotu");

  const body = c.req.valid("json");

  // Determine which fields the user is allowed to update
  const allowedFields = new Set<string>();

  // All permissions now allow updating ownerId and ownerGroupId
  if (permission === "admin" || permission === "owner") {
    allowedFields.add("name");
    allowedFields.add("manufacturer");
    allowedFields.add("model");
    allowedFields.add("serial");
    allowedFields.add("inventoryNumber");
    allowedFields.add("description");
    allowedFields.add("purchaseDate");
    allowedFields.add("systemId");
    allowedFields.add("categoryId");
    allowedFields.add("statusId");
    allowedFields.add("locationId");
    allowedFields.add("ownerId");
    allowedFields.add("ownerGroupId");
  } else if (permission === "manage") {
    allowedFields.add("name");
    allowedFields.add("manufacturer");
    allowedFields.add("model");
    allowedFields.add("serial");
    allowedFields.add("inventoryNumber");
    allowedFields.add("description");
    allowedFields.add("purchaseDate");
    allowedFields.add("systemId");
    allowedFields.add("categoryId");
    allowedFields.add("statusId");
    allowedFields.add("locationId");
    allowedFields.add("ownerId");
    allowedFields.add("ownerGroupId");
  } else if (permission === "edit") {
    allowedFields.add("statusId");
    allowedFields.add("description");
    allowedFields.add("ownerId");
    allowedFields.add("ownerGroupId");
  }

  // Build updateData only from allowed fields
  const updateData: Record<string, unknown> = {};
  for (const key of Object.keys(body) as (keyof typeof body)[]) {
    if (allowedFields.has(key) && (body as any)[key] !== undefined) {
      updateData[key] = (body as any)[key];
    }
  }

  // If no fields to update, return error
  if (Object.keys(updateData).length === 0) badRequest("No fields to update");

  await db.update(items).set(updateData).where(eq(items.id, id));
  const updated = await db.select().from(items).where(eq(items.id, id)).limit(1);

  await createAuditLog(db, {
    userId: c.get("userId"),
    itemId: id,
    action: "ITEM_UPDATED",
    oldValue: item,
    newValue: updated[0],
  });
  return c.json(toResponse(updated[0]));
});

router.delete("/:id", async (c) => {
  const db = c.get("db");
  const id = Number(c.req.param("id"));
  if (c.get("userRole") !== "admin") forbidden("Only admins can delete items");
  const existing = await db.select().from(items).where(eq(items.id, id)).limit(1);
  if (existing.length === 0) notFound("Item not found");

  await createAuditLog(db, {
  userId: c.get("userId"),
  itemId: id,
  action: "ITEM_DELETED",
  oldValue: existing[0],
});

  await db.delete(items).where(eq(items.id, id));
  return c.body(null, 204);
});

export { router as itemsRouter };
