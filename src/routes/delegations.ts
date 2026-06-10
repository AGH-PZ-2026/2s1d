import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, desc, inArray } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { delegations, users, groups } from "../db/schema";
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

async function resolveUserEmails(db: MySql2Database<Record<string, never>>, ids: number[]): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  if (ids.length === 0) return map;
  const rows = await db.select({ id: users.id, email: users.email }).from(users).where(inArray(users.id, ids));
  for (const r of rows) map.set(r.id, r.email);
  return map;
}

async function resolveGroupNames(db: MySql2Database<Record<string, never>>, ids: number[]): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  if (ids.length === 0) return map;
  const rows = await db.select({ id: groups.id, name: groups.name }).from(groups).where(inArray(groups.id, ids));
  for (const r of rows) map.set(r.id, r.name);
  return map;
}

router.get("/:itemId/delegations", async (c) => {
  const db = c.get("db");
  const itemId = Number(c.req.param("itemId"));
  const rows = await db.select().from(delegations).where(eq(delegations.itemId, itemId)).orderBy(desc(delegations.id));

  const userIds = [...new Set(rows.map((r) => r.userId).filter((v): v is number => v !== null))];
  const groupIds = [...new Set(rows.map((r) => r.groupId).filter((v): v is number => v !== null))];

  const [userMap, groupMap] = await Promise.all([
    resolveUserEmails(db, userIds),
    resolveGroupNames(db, groupIds),
  ]);

  return c.json(
    rows.map((r) => ({
      id: r.id,
      item_id: r.itemId,
      user_id: r.userId,
      group_id: r.groupId,
      permission: r.permission,
      user_email: r.userId ? (userMap.get(r.userId) ?? null) : null,
      group_name: r.groupId ? (groupMap.get(r.groupId) ?? null) : null,
    })),
  );
});

router.post("/:itemId/delegations", zValidator("json", createSchema), async (c) => {
  const db = c.get("db");
  const itemId = Number(c.req.param("itemId"));
  const body = c.req.valid("json");
  if (!body.user_id && !body.group_id) badRequest("Podaj użytkownika lub grupę.");

  const result = await db.insert(delegations).values({
    itemId,
    userId: body.user_id ?? null,
    groupId: body.group_id ?? null,
    permission: body.permission,
  });
  const created = await db.select().from(delegations).where(eq(delegations.id, result[0].insertId)).limit(1);

  let userEmail: string | null = null;
  let groupName: string | null = null;
  if (body.user_id) {
    const u = await db.select({ email: users.email }).from(users).where(eq(users.id, body.user_id)).limit(1);
    if (u.length > 0) userEmail = u[0].email;
  }
  if (body.group_id) {
    const g = await db.select({ name: groups.name }).from(groups).where(eq(groups.id, body.group_id)).limit(1);
    if (g.length > 0) groupName = g[0].name;
  }

  return c.json({
    id: created[0].id,
    item_id: created[0].itemId,
    user_id: created[0].userId,
    group_id: created[0].groupId,
    permission: created[0].permission,
    user_email: userEmail,
    group_name: groupName,
  }, 201);
});

router.delete("/:itemId/delegations/:id", async (c) => {
  const db = c.get("db");
  const id = Number(c.req.param("id"));
  await db.delete(delegations).where(eq(delegations.id, id));
  return c.body(null, 204);
});

export { router as delegationsRouter };
