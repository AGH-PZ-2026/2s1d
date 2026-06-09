import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { inArray } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { items } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { notFound } from "../lib/errors";

type Variables = { db: MySql2Database<Record<string, never>>; userId: number; userRole: "admin" | "user"; isAuthenticated: boolean };
const router = new Hono<{ Variables: Variables; Bindings: Env }>();
router.use("/*", authMiddleware);

// POST /api/v1/batch-qr/print — frontend sends { item_ids, size }
const batchSchema = z.object({ item_ids: z.array(z.number().int().positive()).min(1).max(100), size: z.enum(["small", "medium", "large"]).default("medium") });

router.post("/print", zValidator("json", batchSchema), async (c) => {
  const db = c.get("db");
  const body = c.req.valid("json");
  const rows = await db.select({ id: items.id, systemId: items.systemId, name: items.name }).from(items).where(inArray(items.id, body.item_ids));
  if (rows.length === 0) notFound("No items found");

  // Generate a simple text-based "PDF" (in production this would render actual QR codes)
  const lines = rows.map((item, i) =>
    `Item ${i + 1}: ${item.name} (ID: ${item.id}, System: ${item.systemId ?? "N/A"})`
  );
  const content = `QR Labels (${body.size} size)\n${"=".repeat(40)}\n${lines.join("\n")}`;

  return new Response(content, {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=qr_labels.pdf" },
  });
});

export { router as batchQrRouter };
