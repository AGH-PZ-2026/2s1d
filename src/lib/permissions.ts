import { eq, or, and, inArray } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { delegations, groupMembers } from "../db/schema";

export type PermissionLevel = "admin" | "owner" | "manage" | "edit" | null;

export async function getItemPermissionLevel(
  db: MySql2Database<Record<string, never>>,
  itemId: number,
  userId: number,
  userRole: "admin" | "user",
  ownerId: number | null
): Promise<PermissionLevel> {
  if (userRole === "admin") return "admin";
  if (ownerId !== null && ownerId === userId) return "owner";

  // Check delegations
  const userGroups = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, userId));
  
  const groupIds = userGroups.map((g) => g.groupId);

  const conditions = [eq(delegations.userId, userId)];
  if (groupIds.length > 0) {
    conditions.push(inArray(delegations.groupId, groupIds));
  }

  const perms = await db
    .select({ permission: delegations.permission })
    .from(delegations)
    .where(and(eq(delegations.itemId, itemId), or(...conditions)));

  if (perms.some((p) => p.permission === "manage")) return "manage";
  if (perms.some((p) => p.permission === "edit")) return "edit";

  return null;
}
