import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { delegations, type Delegation } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { notFound, badRequest } from "../lib/errors";

type Variables = { db: MySql2Database<Record<string, never>>; userId: number; userRole: "admin" | "user"; isAuthenticated: boolean };
const router = new Hono<{ Variables: Variables; Bindings: Env }>();
router.use("/*", authMiddleware);

const createSchema = z.object({
  user_id: z.number().int().positive().optional(),
  group_id: z.number().int().positive().optional(),
  permission: z.enum(["edit", "manage"]),
});

function toResponse(d: Delegation) { return { id: d.id, item_id: d.itemId, user_id: d.userId, group_id: d.groupId, permission: d.permission }; }

// Nested under items: /api/v1/items/:itemId/delegations
router.get("/:itemId/delegations", async (c) => {
  const db = c.get("db"); const itemId = Number(c.req.param("itemId"));
  const rows = await db.select().from(delegations).where(eq(delegations.itemId, itemId)).orderBy(desc(delegations.id));
  return c.json(rows.map(toResponse));
});

router.post("/:itemId/delegations", zValidator("json", createSchema), async (c) => {
  const db = c.get("db"); const itemId = Number(c.req.param("itemId")); const body = c.req.valid("json");
  if (!body.user_id && !body.group_id) badRequest("Podaj użytkownika lub grupę.");
  const result = await db.insert(delegations).values({ itemId, userId: body.user_id ?? null, groupId: body.group_id ?? null, permission: body.permission });
  const created = await db.select().from(delegations).where(eq(delegations.id, result[0].insertId)).limit(1);
  return c.json(toResponse(created[0]), 201);
});

router.delete("/:itemId/delegations/:id", async (c) => {
  const db = c.get("db"); const id = Number(c.req.param("id"));
  await db.delete(delegations).where(eq(delegations.id, id));
  return c.body(null, 204);
});

export { router as delegationsRouter };
