import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { dbMiddleware } from "./middleware/db";
import { authRouter } from "./routes/auth";
import { statusesRouter } from "./routes/statuses";
import { categoriesRouter } from "./routes/categories";
import { itemsRouter } from "./routes/items";
import { locationsRouter } from "./routes/locations";
import { borrowingsRouter } from "./routes/borrowings";
import { delegationsRouter } from "./routes/delegations";
import { groupsRouter } from "./routes/groups";
import { usersRouter } from "./routes/users";
import { qrCodesRouter } from "./routes/qr-codes";
import { batchQrRouter } from "./routes/batch-qr";
import { quickActionRouter } from "./routes/quick-action";
import { excelImportRouter } from "./routes/excel-import";
import { itemPhotosRouter } from "./routes/item-photos";
import { notificationsRouter } from "./routes/notifications";
import { auditLogsRouter } from "./routes/audit-logs";

const app = new Hono<{ Bindings: Env }>({ strict: false });

app.use("*", cors());
app.use("/api/*", dbMiddleware);

app.route("/api/v1/auth", authRouter);
app.route("/api/v1/item-status", statusesRouter);
app.route("/api/v1/categories", categoriesRouter);
app.route("/api/v1/locations", locationsRouter);
app.route("/api/v1/borrowings", borrowingsRouter);
app.route("/api/v1/groups", groupsRouter);
app.route("/api/v1/users", usersRouter);
app.route("/api/v1/qr-codes", qrCodesRouter);
app.route("/api/v1/batch-qr", batchQrRouter);
app.route("/api/v1/quick-actions", quickActionRouter);
app.route("/api/v1/excel", excelImportRouter);
app.route("/api/v1/notifications", notificationsRouter);
app.route("/api/v1/audit-logs", auditLogsRouter);
// Mount nested routers BEFORE generic items router
app.route("/api/v1/items", delegationsRouter);
app.route("/api/v1/items", itemPhotosRouter);
app.route("/api/v1/items", itemsRouter);

app.get("/api/health", (c) => c.json({ status: "ok" }));

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ detail: err.message }, err.status as 400 | 401 | 403 | 404 | 500);
  }
  console.error(JSON.stringify({ message: "unhandled error", error: err instanceof Error ? err.message : String(err) }));
  return c.json({ detail: "Internal server error" }, 500);
});

app.notFound((c) => c.json({ detail: "Not found" }, 404));

export default app;
