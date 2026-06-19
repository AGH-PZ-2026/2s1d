import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, desc, isNull, sql, and, lte } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { notificationPreferences, notificationEvents, type NotificationPreference } from "../db/schema";
import { authMiddleware } from "../middleware/auth";

type Variables = { db: MySql2Database<Record<string, never>>; userId: number; userRole: "admin" | "user"; isAuthenticated: boolean };
const router = new Hono<{ Variables: Variables; Bindings: Env }>();
router.use("/*", authMiddleware);

function prefToResponse(p: NotificationPreference) {
  return { id: p.id, userId: p.userId, emailEnabled: p.emailEnabled, pushEnabled: p.pushEnabled, returnDueNoticeHours: p.returnDueNoticeHours };
}

const updatePrefSchema = z.object({
  emailEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  returnDueNoticeHours: z.number().int().min(1).max(720).optional(),
});

// GET/PUT /api/v1/notifications/preferences
router.get("/preferences", async (c) => {
  const db = c.get("db"); const userId = c.get("userId");
  const rows = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId)).limit(1);
  if (rows.length === 0) {
    const result = await db.insert(notificationPreferences).values({ userId });
    const created = await db.select().from(notificationPreferences).where(eq(notificationPreferences.id, result[0].insertId)).limit(1);
    return c.json(prefToResponse(created[0]));
  }
  return c.json(prefToResponse(rows[0]));
});

router.put("/preferences", zValidator("json", updatePrefSchema), async (c) => {
  const db = c.get("db"); const userId = c.get("userId"); const body = c.req.valid("json");
  const existing = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId)).limit(1);
  if (existing.length === 0) {
    const result = await db.insert(notificationPreferences).values({ userId, emailEnabled: body.emailEnabled ?? true, pushEnabled: body.pushEnabled ?? false, returnDueNoticeHours: body.returnDueNoticeHours ?? 24 });
    const created = await db.select().from(notificationPreferences).where(eq(notificationPreferences.id, result[0].insertId)).limit(1);
    return c.json(prefToResponse(created[0]));
  }
  const d: Record<string, unknown> = {};
  if (body.emailEnabled !== undefined) d.emailEnabled = body.emailEnabled;
  if (body.pushEnabled !== undefined) d.pushEnabled = body.pushEnabled;
  if (body.returnDueNoticeHours !== undefined) d.returnDueNoticeHours = body.returnDueNoticeHours;
  await db.update(notificationPreferences).set(d).where(eq(notificationPreferences.userId, userId));
  const updated = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId)).limit(1);
  return c.json(prefToResponse(updated[0]));
});

// GET /api/v1/notifications/events
router.get("/events", async (c) => {
  const db = c.get("db"); const userId = c.get("userId");
  const notifications = await db
  .select()
  .from(notificationEvents)
  .where(
    and(
      eq(notificationEvents.userId, userId),
      lte(notificationEvents.scheduledAt, new Date())
    )
  )
  .orderBy(desc(notificationEvents.scheduledAt));return c.json(notifications);
});

export { router as notificationsRouter };
