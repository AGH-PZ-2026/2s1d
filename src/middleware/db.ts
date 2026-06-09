import { createMiddleware } from "hono/factory";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { createDb } from "../db/client";

type Variables = { db: MySql2Database<Record<string, never>> };

export const dbMiddleware = createMiddleware<{ Variables: Variables; Bindings: Env }>(
  async (c, next) => {
    const db = await createDb(c.env.HYPERDRIVE);
    c.set("db", db);
    await next();
  },
);
