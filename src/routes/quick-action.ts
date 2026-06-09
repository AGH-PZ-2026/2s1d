import { Hono } from "hono";
import { eq } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { items, borrowings, auditLogs } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { notFound } from "../lib/errors";

type Variables = { db: MySql2Database<Record<string, never>>; userId: number; userRole: "admin" | "user"; isAuthenticated: boolean };
const router = new Hono<{ Variables: Variables; Bindings: Env }>();
router.use("/*", authMiddleware);

// GET /api/v1/quick-actions/:itemId
router.get("/:itemId", async (c) => {
  const db = c.get("db"); const itemId = Number(c.req.param("itemId"));
  const rows = await db.select().from(items).where(eq(items.id, itemId)).limit(1);
  if (rows.length === 0) notFound("Item not found");
  const item = rows[0];
  return c.json({ id: item.id, name: item.name, location: item.locationId ? String(item.locationId) : "Brak lokalizacji", owner_id: item.ownerId, status: item.statusId ? String(item.statusId) : "Nieznany" });
});

// PATCH /api/v1/quick-actions/:itemId/mark-damaged
router.patch("/:itemId/mark-damaged", async (c) => {
  const db = c.get("db"); const userId = c.get("userId"); const itemId = Number(c.req.param("itemId"));
  const rows = await db.select().from(items).where(eq(items.id, itemId)).limit(1);
  if (rows.length === 0) notFound("Item not found");
  await db.update(items).set({ statusId: 4 }).where(eq(items.id, itemId));
  await db.insert(auditLogs).values({ userId, action: "mark_damaged", itemId, oldValue: { statusId: rows[0].statusId }, newValue: { statusId: 4 } });
  return c.json({ id: itemId, name: rows[0].name, location: rows[0].locationId ? String(rows[0].locationId) : "Brak lokalizacji", owner_id: rows[0].ownerId, status: "4" });
});

export { router as quickActionRouter };
