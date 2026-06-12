import { createMiddleware } from "hono/factory";
import type { MySql2Database } from "drizzle-orm/mysql2";
import type { Connection } from "mysql2/promise";
import { createDb } from "../db/client";

type Variables = { 
  db: MySql2Database<Record<string, never>>;
  rawDb: Connection;
};

export const dbMiddleware = createMiddleware<{ Variables: Variables; Bindings: Env }>(
  async (c, next) => {
    const conn = await createDb(c.env.HYPERDRIVE);
    c.set("db", conn);
    // Expose raw mysql2 connection for reference table queries
    c.set("rawDb", (conn as any).session?.client as Connection);
    await next();
  },
);
