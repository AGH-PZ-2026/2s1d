import { Hono } from "hono";
import { eq, desc, sql } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { items, auditLogs } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { badRequest } from "../lib/errors";

type Variables = { db: MySql2Database<Record<string, never>>; userId: number; userRole: "admin" | "user"; isAuthenticated: boolean };
const router = new Hono<{ Variables: Variables; Bindings: Env }>();
router.use("/*", authMiddleware);

// POST /api/v1/excel/upload — frontend sends multipart FormData with "file"
router.post("/upload", async (c) => {
  const db = c.get("db");
  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;
  if (!file) badRequest("No file uploaded");

  const text = await file.text();
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length < 2) badRequest("CSV must contain header and at least one data row");

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const nameIdx = headers.indexOf("name");
  const manufacturerIdx = headers.indexOf("manufacturer");
  const descriptionIdx = headers.indexOf("description");
  const purchaseDateIdx = headers.indexOf("purchase_date");
  const categoryIdx = headers.indexOf("category_id");
  const statusIdx = headers.indexOf("status_id");
  const locationIdx = headers.indexOf("location_id");
  const ownerIdx = headers.indexOf("owner_id");

  if (nameIdx === -1) badRequest('CSV must contain "name" column');

  const errors: { row_number: number; error_message: string }[] = [];
  let successful = 0;
  const total = lines.length - 1;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    const name = cols[nameIdx];
    if (!name) { errors.push({ row_number: i, error_message: `Row ${i}: name is required` }); continue; }
    try {
      const categoryId = categoryIdx !== -1 && cols[categoryIdx] ? Number(cols[categoryIdx]) : null;
      const statusId = statusIdx !== -1 && cols[statusIdx] ? Number(cols[statusIdx]) : null;
      const locationId = locationIdx !== -1 && cols[locationIdx] ? Number(cols[locationIdx]) : null;
      const ownerId = ownerIdx !== -1 && cols[ownerIdx] ? Number(cols[ownerIdx]) : null;

      const vals: Record<string, unknown> = {
        name,
        manufacturer: manufacturerIdx !== -1 ? cols[manufacturerIdx] || null : null,
        description: descriptionIdx !== -1 ? cols[descriptionIdx] || null : null,
        addedAt: sql`NOW()`,
        categoryId, statusId, locationId, ownerId,
      };
      if (purchaseDateIdx !== -1 && cols[purchaseDateIdx]) vals.purchaseDate = cols[purchaseDateIdx];
      const result = await db.insert(items).values(vals as unknown as typeof items.$inferInsert);

      await db.insert(auditLogs).values({ userId: c.get("userId"), action: "import_xlsx", itemId: result[0].insertId, newValue: { name, source: "xlsx_import" } });
      successful++;
    } catch (err) {
      errors.push({ row_number: i, error_message: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  return c.json({ total_rows_processed: total, successful_rows: successful, errors });
});

export { router as excelImportRouter };
