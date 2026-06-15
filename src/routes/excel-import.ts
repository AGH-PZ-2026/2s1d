import { Hono } from "hono";
import { eq, desc, sql } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { items, auditLogs } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { badRequest, forbidden } from "../lib/errors";
import * as XLSX from "xlsx";
import { createAuditLog } from "../lib/audit";

type Variables = { db: MySql2Database<Record<string, never>>; userId: number; userRole: "admin" | "user"; isAuthenticated: boolean };
const router = new Hono<{ Variables: Variables; Bindings: Env }>();
router.use("/*", authMiddleware);


function excelDateToDate(serial: number): string {
  const date = new Date(
    (serial - 25569) * 86400 * 1000
  );

  return date.toISOString().split("T")[0];
}

// POST /api/v1/excel/upload — frontend sends multipart FormData with "file"
router.post("/upload", async (c) => {
    if (c.get("userRole") !== "admin") {
    forbidden("Only admins can import data");
  }
  const db = c.get("db");
  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;
  if (!file) badRequest("No file uploaded");

  const mappingRaw = formData.get("column_mapping");

  const columnMapping: Record<string, string> = mappingRaw ? JSON.parse(String(mappingRaw)) : {};
  
  let rows: Record<string, string>[] = [];

  if (
  file.name.endsWith(".xlsx") ||
  file.type.includes("sheet")
  ) {
    const buffer = await file.arrayBuffer();

    const workbook = XLSX.read(buffer, {
      type: "array",
    });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    rows = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
    }) as Record<string, string>[];
  }
  else{
    const text = await file.text();

    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      badRequest(
        "CSV must contain header and at least one data row"
      );
    }

    const headers = lines[0]
      .split(",")
      .map((h) => h.trim());

    rows = lines.slice(1).map((line) => {
      const cols = line.split(",");

      const row: Record<string, string> = {};

      headers.forEach((header, idx) => {
        row[header] = cols[idx]?.trim() ?? "";
      });

      return row;
    });
  }



  const errors: { row_number: number; error_message: string }[] = [];
  let successful = 0;
  const total = rows.length ;


  for (let i = 0; i < rows.length; i++) {
  const rawRow = rows[i];

  const row: Record<string, unknown> = {};

  for (const [field, columnName] of Object.entries(
    columnMapping
  )) {
    row[field] =
      rawRow[
        columnName as keyof typeof rawRow
      ];
  }
  console.log("mapping", columnMapping);
console.log("rawRow", rawRow);
console.log("mapped", row);

  const name = String(
    row.name ?? ""
  ).trim();

  if (!name) {
    errors.push({
      row_number: i + 1,
      error_message: `Row ${i + 1}: name is required`,
    });
    continue;
  }

  try {
    const categoryId =
      row.category_id
        ? Number(row.category_id)
        : null;

    const statusId =
      row.status_id
        ? Number(row.status_id)
        : null;

    const locationId =
      row.location_id
        ? Number(row.location_id)
        : null;

    const ownerId =
      row.owner_id
        ? Number(row.owner_id)
        : null;

    const vals: Record<string, unknown> = {
      name,
      manufacturer:
        row.manufacturer || null,
      description:
        row.description || null,
      addedAt: sql`NOW()`,
      categoryId,
      statusId,
      locationId,
      ownerId,
    };

    if (row.purchase_date) {
      const value = row.purchase_date;

      if (typeof value === "number") {
        vals.purchaseDate =
          excelDateToDate(value);
      } else {
        vals.purchaseDate = value;
      }
    }

    const result = await db
      .insert(items)
      .values(
        vals as typeof items.$inferInsert
      );

      await createAuditLog(db, {
        userId: c.get("userId"),
        itemId: result[0].insertId,
        action: "ITEM_IMPORTED",
        newValue: {
          name,
          source: file.name.endsWith(".xlsx")
            ? "xlsx_import"
            : "csv_import",
        },
      });

    successful++;
  } catch (err) {
    errors.push({
      row_number: i + 1,
      error_message:
        err instanceof Error
          ? err.message
          : "Unknown error",
    });
  }
}

  return c.json({ total_rows_processed: total, successful_rows: successful, errors });
});

export { router as excelImportRouter };
