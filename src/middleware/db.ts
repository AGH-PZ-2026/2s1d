import { createMiddleware } from "hono/factory";
import { createDb } from "../db/client";

export const dbMiddleware = createMiddleware(async (c, next) => {
  const db = createDb(c.env.HYPERDRIVE);
  c.set("db", db);
  await next();
});
