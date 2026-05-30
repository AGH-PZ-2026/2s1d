import type { Status } from "./schema";

export const SYSTEM_STATUSES: Omit<Status, "id" | "description">[] = [
  { name: "Dostępny", isSystem: true, slug: "dostepny" },
  { name: "Wypożyczony", isSystem: true, slug: "wypozyczony" },
  { name: "Zarezerwowany", isSystem: true, slug: "zarezerwowany" },
  { name: "Uszkodzony", isSystem: true, slug: "uszkodzony" },
  { name: "Oczekuje zatwierdzenia", isSystem: true, slug: "oczekuje-zatwierdzenia" },
];

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
