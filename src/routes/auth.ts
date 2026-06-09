import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { users } from "../db/schema";
import { createAuthToken } from "../middleware/auth";
import { badRequest, unauthorized } from "../lib/errors";

type Variables = { db: MySql2Database<Record<string, never>> };

const router = new Hono<{ Variables: Variables; Bindings: Env }>();

// Mock SSO — frontend expects POST /api/v1/auth/mock-sso
// Body: { email, role } → Response: { access_token, token_type, user }
const mockSsoSchema = z.object({
  email: z.string().email().transform((v) => v.trim().toLowerCase()),
  role: z.enum(["admin", "user"]),
});

router.post("/mock-sso", zValidator("json", mockSsoSchema), async (c) => {
  const db = c.get("db");
  const body = c.req.valid("json");

  let userRows = await db.select().from(users).where(eq(users.email, body.email)).limit(1);

  if (userRows.length === 0) {
    const result = await db.insert(users).values({
      email: body.email,
      hashedPassword: "mock-sso-no-password",
      isApproved: true,
      role: body.role,
    });
    const created = await db.select().from(users).where(eq(users.id, result[0].insertId)).limit(1);
    userRows = created;
  }

  const user = userRows[0];
  if (!user.isActive) unauthorized("Account is deactivated");
  if (!user.isApproved) unauthorized("Account pending admin approval");

  const token = await createAuthToken(user.id, user.role as "admin" | "user", c.env.JWT_SECRET);

  return c.json({
    access_token: token,
    token_type: "bearer",
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      is_active: user.isActive,
      is_approved: user.isApproved,
    },
  });
});

// Register — frontend expects POST /api/v1/auth/register
// Body: { email, password } → Response: { message }
const registerSchema = z.object({
  email: z.string().email().transform((v) => v.trim().toLowerCase()),
  password: z.string().min(8),
});

router.post("/register", zValidator("json", registerSchema), async (c) => {
  const db = c.get("db");
  const body = c.req.valid("json");

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email)).limit(1);
  if (existing.length > 0) badRequest("User with this email already exists");

  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(body.password));
  const hashedPassword = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");

  await db.insert(users).values({
    email: body.email,
    hashedPassword,
    isApproved: false,
    role: "user",
  });

  return c.json({ message: "Konto wymaga zatwierdzenia przez administratora" }, 201);
});

// List users (for owners dropdown) — frontend expects GET /api/v1/auth/users
// Response: [{ id, email }]
router.get("/users", async (c) => {
  const db = c.get("db");
  const rows = await db.select({ id: users.id, email: users.email }).from(users);
  return c.json(rows);
});

export { router as authRouter };
