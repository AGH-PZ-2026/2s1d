import { int, mysqlTable, varchar, boolean, uniqueIndex } from "drizzle-orm/mysql-core";
import { foreignKey } from "drizzle-orm/mysql-core";

export const categories = mysqlTable(
  "categories",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    parentId: int("parent_id"),
  },
  (table) => ({
    parentFk: foreignKey({
      name: "categories_parent_fk",
      columns: [table.parentId],
      foreignColumns: [table.id],
    }).onDelete("set null"),
  }),
);

export const itemStatus = mysqlTable(
  "item_status",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    isSystem: boolean("is_system").notNull().default(false),
    slug: varchar("slug", { length: 100 }),
    description: varchar("description", { length: 500 }),
  },
  (table) => ({
    nameUnique: uniqueIndex("unique_item_status_name").on(table.name),
  }),
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Status = typeof itemStatus.$inferSelect;
export type NewStatus = typeof itemStatus.$inferInsert;
