import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, isNull, ne } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { categories, type Category } from "../db/schema";
import { badRequest, notFound } from "../lib/errors";

type Variables = { db: MySql2Database<Record<string, never>> };

const categorySchema = z.object({
  name: z
    .string()
    .min(1, "Nazwa kategorii nie może być pusta!")
    .max(100, "Nazwa kategorii nie może być dłuższa niż 100 znaków.")
    .transform((v) => v.trim()),
  parentId: z.number().int().positive().nullable().optional(),
});

type CategoryInput = z.infer<typeof categorySchema>;

const router = new Hono<{ Variables: Variables }>();

function toResponse(cat: Category) {
  return {
    id: cat.id,
    name: cat.name,
    parentId: cat.parentId ?? null,
  };
}

async function ensureParentExists(
  db: MySql2Database<Record<string, never>>,
  parentId: number,
) {
  const parent = await db
    .select()
    .from(categories)
    .where(eq(categories.id, parentId))
    .limit(1);
  if (parent.length === 0) {
    notFound("Kategoria-rodzic nie istnieje");
  }
}

async function checkNameUnique(
  db: MySql2Database<Record<string, never>>,
  name: string,
  parentId: number | null,
  excludeId?: number,
) {
  const conditions = [eq(categories.name, name)];
  if (parentId === null) {
    conditions.push(isNull(categories.parentId));
  } else {
    conditions.push(eq(categories.parentId, parentId));
  }
  if (excludeId !== undefined) {
    conditions.push(ne(categories.id, excludeId));
  }

  const existing = await db
    .select()
    .from(categories)
    .where(and(...conditions))
    .limit(1);

  if (existing.length > 0) {
    badRequest(
      "Kategoria o tej nazwie, pod tym samym rodzicem już istnieje :(",
    );
  }
}

async function getDescendantIds(
  db: MySql2Database<Record<string, never>>,
  categoryId: number,
): Promise<Set<number>> {
  const ids = new Set<number>([categoryId]);
  const children = await db
    .select()
    .from(categories)
    .where(eq(categories.parentId, categoryId));

  for (const child of children) {
    const childIds = await getDescendantIds(db, child.id);
    for (const id of childIds) ids.add(id);
  }
  return ids;
}

async function checkNoCycle(
  db: MySql2Database<Record<string, never>>,
  categoryId: number,
  newParentId: number,
) {
  if (categoryId === newParentId) {
    badRequest(
      "Kategoria nie może być jednocześnie swoim własnym rodzicem!",
    );
  }
  const descendants = await getDescendantIds(db, categoryId);
  if (descendants.has(newParentId)) {
    badRequest("Zmiana rodzica spowodowałaby cykl w drzewie kategorii");
  }
}

router.get("/tree", async (c) => {
  const db = c.get("db");
  const allCategories = await db.select().from(categories);

  const byId = new Map<number, CategoryTree>();
  const roots: CategoryTree[] = [];

  for (const cat of allCategories) {
    byId.set(cat.id, { id: cat.id, name: cat.name, parentId: cat.parentId ?? null, children: [] });
  }

  for (const cat of allCategories) {
    const node = byId.get(cat.id)!;
    if (cat.parentId !== null) {
      const parent = byId.get(cat.parentId);
      if (parent) {
        parent.children.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  return c.json(roots);
});

router.get("/", async (c) => {
  const db = c.get("db");
  const rows = await db.select().from(categories);
  return c.json(rows.map(toResponse));
});

router.get("/:id", async (c) => {
  const db = c.get("db");
  const id = Number(c.req.param("id"));
  const rows = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);

  if (rows.length === 0) {
    notFound("Kategoria nie istnieje");
  }
  return c.json(toResponse(rows[0]));
});

router.post("/", zValidator("json", categorySchema), async (c) => {
  const db = c.get("db");
  const body = c.req.valid("json") as CategoryInput;

  if (body.parentId != null) {
    await ensureParentExists(db, body.parentId);
  }

  await checkNameUnique(db, body.name, body.parentId ?? null);

  const result = await db.insert(categories).values({
    name: body.name,
    parentId: body.parentId ?? null,
  });

  const created = await db
    .select()
    .from(categories)
    .where(eq(categories.id, result[0].insertId))
    .limit(1);

  return c.json(toResponse(created[0]), 201);
});

router.patch("/:id", zValidator("json", categorySchema), async (c) => {
  const db = c.get("db");
  const id = Number(c.req.param("id"));
  const body = c.req.valid("json") as CategoryInput;

  const existing = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);

  if (existing.length === 0) {
    notFound("Kategoria nie istnieje");
  }

  await checkNameUnique(db, body.name, body.parentId ?? null, id);

  if (body.parentId != null) {
    await ensureParentExists(db, body.parentId);
    await checkNoCycle(db, id, body.parentId);
  }

  await db
    .update(categories)
    .set({
      name: body.name,
      parentId: body.parentId ?? null,
    })
    .where(eq(categories.id, id));

  const updated = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);

  return c.json(toResponse(updated[0]));
});

router.delete("/:id", async (c) => {
  const db = c.get("db");
  const id = Number(c.req.param("id"));

  const existing = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);

  if (existing.length === 0) {
    notFound("Kategoria nie istnieje");
  }

  const children = await db
    .select()
    .from(categories)
    .where(eq(categories.parentId, id));

  if (children.length > 0) {
    badRequest("Nie można usunąć kategorii, która ma podkategorie");
  }

  await db.delete(categories).where(eq(categories.id, id));

  return c.body(null, 204);
});

interface CategoryTree {
  id: number;
  name: string;
  parentId: number | null;
  children: CategoryTree[];
}

export { router as categoriesRouter };
