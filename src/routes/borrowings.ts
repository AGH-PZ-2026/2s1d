import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { borrowings, items } from "../db/schema";
import type { Borrowing } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { notFound, badRequest, forbidden } from "../lib/errors";

type Variables = { db: MySql2Database<Record<string, never>>; userId: number; userRole: "admin" | "user"; isAuthenticated: boolean };

const router = new Hono<{ Variables: Variables; Bindings: Env }>();
router.use("/*", authMiddleware);

const createSchema = z.object({
  itemId: z.number().int().positive(),
  borrowerId: z.number().int().positive().optional(),
  externalBorrower: z.string().max(160).optional(),
  mode: z.enum(["classic", "trusted", "asynchronous", "external"]),
  plannedReturnAt: z.string().optional(),
});

function toResponse(b: Borrowing) {
  return { id: b.id, itemId: b.itemId, borrowerId: b.borrowerId, externalBorrower: b.externalBorrower, mode: b.mode, status: b.status, plannedReturnAt: b.plannedReturnAt, approvedAt: b.approvedAt, handedOverAt: b.handedOverAt, returnedAt: b.returnedAt, returnComment: b.returnComment, createdAt: b.createdAt };
}

router.get("/", async (c) => {
  const db = c.get("db");
  const status = c.req.query("status");
  const userId = c.req.query("userId");
  const conditions = [];
  if (status) conditions.push(eq(borrowings.status, status as Borrowing["status"]));
  if (userId) conditions.push(eq(borrowings.borrowerId, Number(userId)));
  const rows = await db.select().from(borrowings).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(desc(borrowings.createdAt));
  return c.json(rows.map(toResponse));
});

router.get("/overdue", async (c) => {
  const db = c.get("db");
  const includeAll = c.req.query("includeAll") === "true";
  const baseCondition = and(eq(borrowings.status, "borrowed"), sql`${borrowings.plannedReturnAt} < NOW()`);
  const filterByUser = !includeAll && c.get("userRole") !== "admin";
  const rows = await db.select().from(borrowings)
    .where(filterByUser ? and(baseCondition, eq(borrowings.borrowerId, c.get("userId"))) : baseCondition)
    .orderBy(borrowings.plannedReturnAt);
  const result = rows.map((b) => ({
    borrowingId: b.id, itemId: b.itemId, itemName: "", ownerId: null, borrowerId: b.borrowerId, externalBorrower: b.externalBorrower, plannedReturnAt: b.plannedReturnAt, daysOverdue: b.plannedReturnAt ? Math.floor((Date.now() - new Date(b.plannedReturnAt).getTime()) / 86400000) : 0,
  }));
  // Resolve item name
  for (const r of result) {
    const item = await db.select({ name: items.name }).from(items).where(eq(items.id, r.itemId)).limit(1);
    r.itemName = item[0]?.name ?? "Unknown";
  }
  return c.json(result);
});

router.get("/:id", async (c) => {
  const db = c.get("db"); const id = Number(c.req.param("id"));
  const rows = await db.select().from(borrowings).where(eq(borrowings.id, id)).limit(1);
  if (rows.length === 0) notFound("Borrowing not found");
  return c.json(toResponse(rows[0]));
});

router.post("/", zValidator("json", createSchema), async (c) => {
  const db = c.get("db"); const body = c.req.valid("json");
  const itemRows = await db.select().from(items).where(eq(items.id, body.itemId)).limit(1);
  if (itemRows.length === 0) notFound("Item not found");

  if (body.mode === "external") {
    const isAdmin = c.get("userRole") === "admin";
    const isOwner = itemRows[0].ownerId === c.get("userId");
    if (!isAdmin && !isOwner) {
      forbidden("Only admins or item owners can create external borrowings");
    }
  }
  if (!body.plannedReturnAt) {
    badRequest("Poda datę planowanego zwrotu");
  }
  const active = await db.select().from(borrowings).where(and(eq(borrowings.itemId, body.itemId), eq(borrowings.status, "borrowed"))).limit(1);
  if (active.length > 0) badRequest("Item is already borrowed");
  const values: Record<string, unknown> = {
    itemId: body.itemId,
    borrowerId: body.borrowerId ?? c.get("userId"),
    externalBorrower: body.externalBorrower ?? null,
    mode: body.mode,
    status: body.mode === "external" ? "borrowed" : "pending",
    approvedAt: body.mode === "external" ? sql`NOW()` : null,
    handedOverAt: body.mode === "external" ? sql`NOW()` : null,
  };
  if (body.plannedReturnAt) values.plannedReturnAt = new Date(body.plannedReturnAt);
  const result = await db.insert(borrowings).values(values as typeof borrowings.$inferInsert);
  const created = await db.select().from(borrowings).where(eq(borrowings.id, result[0].insertId)).limit(1);
  return c.json(toResponse(created[0]), 201);
});

router.patch("/:id/approve", async (c) => {
  const db = c.get("db"); const id = Number(c.req.param("id"));
  const userId = c.get("userId");
  const item = await db.select({ ownerId: items.ownerId }).from(items)
    .innerJoin(borrowings, eq(borrowings.itemId, items.id))
    .where(eq(borrowings.id, id)).limit(1);

  if (c.get("userRole") !== "admin" && item[0]?.ownerId !== userId) {
    forbidden("Only admins or item owners can approve borrowings");
  }
  
  const existing = await db.select().from(borrowings).where(eq(borrowings.id, id)).limit(1);
  if (existing.length === 0) notFound("Borrowing not found");
  if (existing[0].status !== "pending") badRequest("Borrowing is not pending");
  await db.update(borrowings).set({ status: "reserved", approvedAt: sql`NOW()` }).where(eq(borrowings.id, id));
  const updated = await db.select().from(borrowings).where(eq(borrowings.id, id)).limit(1);
  return c.json(toResponse(updated[0]));
});

router.patch("/:id/reject", async (c) => {
  const db = c.get("db"); const id = Number(c.req.param("id"));
  const userId = c.get("userId");
  const item = await db.select({ ownerId: items.ownerId }).from(items)
    .innerJoin(borrowings, eq(borrowings.itemId, items.id))
    .where(eq(borrowings.id, id)).limit(1);

  if (c.get("userRole") !== "admin" && item[0]?.ownerId !== userId) {
    forbidden("Only admins or item owners can reject borrowings");
  }
  const existing = await db.select().from(borrowings).where(eq(borrowings.id, id)).limit(1);
  if (existing.length === 0) notFound("Borrowing not found");
  if (existing[0].status !== "pending") badRequest("Borrowing is not pending");
  await db.update(borrowings).set({ status: "rejected" }).where(eq(borrowings.id, id));
  const updated = await db.select().from(borrowings).where(eq(borrowings.id, id)).limit(1);
  return c.json(toResponse(updated[0]));
});

router.patch("/:id/handover", async (c) => {
  const db = c.get("db"); const id = Number(c.req.param("id"));
  const existing = await db.select().from(borrowings).where(eq(borrowings.id, id)).limit(1);
  if (existing.length === 0) notFound("Borrowing not found");
  if (existing[0].status !== "reserved") badRequest("Borrowing is not reserved");

  const userId = c.get("userId");
  const item = await db.select({ ownerId: items.ownerId }).from(items)
    .innerJoin(borrowings, eq(borrowings.itemId, items.id))
    .where(eq(borrowings.id, id)).limit(1);

  const isAdmin = c.get("userRole") === "admin";
  const isOwner = item[0]?.ownerId === userId;
  const isBorrower = existing[0].borrowerId === userId;
  const isAsynchronous = existing[0].mode === "asynchronous";

  if (!isAdmin && !isOwner && !(isAsynchronous && isBorrower)) {
    forbidden("Only admins, item owners, or borrowers in asynchronous mode can hand over borrowings");
  }

  await db.update(borrowings).set({ status: "borrowed", handedOverAt: sql`NOW()` }).where(eq(borrowings.id, id));
  const updated = await db.select().from(borrowings).where(eq(borrowings.id, id)).limit(1);
  return c.json(toResponse(updated[0]));
});

const returnSchema = z.object({ returnComment: z.string().optional() });
router.patch("/:id/return", zValidator("json", returnSchema), async (c) => {
  const db = c.get("db"); const id = Number(c.req.param("id"));
  const existing = await db.select().from(borrowings).where(eq(borrowings.id, id)).limit(1);
  if (existing.length === 0) notFound("Borrowing not found");
  if (existing[0].status !== "borrowed") badRequest("Only borrowed items can be returned");

  const userId = c.get("userId");
  const isAdmin = c.get("userRole") === "admin";
  const isBorrower = existing[0].borrowerId === userId;
  const isClassic = existing[0].mode === "classic";

  const item = await db.select({ ownerId: items.ownerId }).from(items)
    .where(eq(items.id, existing[0].itemId)).limit(1);
  const isOwner = item[0]?.ownerId === userId;

  if (isClassic && !isAdmin && !isOwner) {
    forbidden("In classic mode only admins or item owners can confirm return");
  }
  if (!isClassic && !isAdmin && !isOwner && !isBorrower) {
    forbidden("Only admins, item owners or borrowers can return borrowings");
  }

  await db.update(borrowings).set({ status: "returned", returnedAt: sql`NOW()`, returnComment: c.req.valid("json").returnComment ?? null }).where(eq(borrowings.id, id));
  const updated = await db.select().from(borrowings).where(eq(borrowings.id, id)).limit(1);
  return c.json(toResponse(updated[0]));
});

export { router as borrowingsRouter };
