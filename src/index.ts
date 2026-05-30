import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { dbMiddleware } from "./middleware/db";
import { categoriesRouter } from "./routes/categories";
import { statusesRouter } from "./routes/statuses";

const app = new Hono();

app.use("*", cors());
app.use("/api/*", dbMiddleware);

app.route("/api/v1/categories", categoriesRouter);
app.route("/api/v1/statuses", statusesRouter);

app.get("/api/health", (c) => {
  return c.json({ status: "ok" });
});

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json(
      { detail: err.message },
      err.status as 400 | 401 | 403 | 404 | 500,
    );
  }

  console.error(
    JSON.stringify({
      message: "unhandled error",
      error: err instanceof Error ? err.message : String(err),
    }),
  );

  return c.json({ detail: "Internal server error" }, 500);
});

app.notFound((c) => {
  return c.json({ detail: "Not found" }, 404);
});

export default app;
