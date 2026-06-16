import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { users } from "../db/schema";
import { createAuthToken } from "../middleware/auth";
import { badRequest, unauthorized } from "../lib/errors";

type Variables = { db: MySql2Database<Record<string, never>> };

const router = new Hono<{ Variables: Variables; Bindings: Env }>();

// ─── Register (local password) ─────────────────────────────────────────────

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
    authProvider: "local",
  });

  return c.json({ message: "Konto wymaga zatwierdzenia przez administratora" }, 201);
});

const loginSchema = z.object({
  email: z.string().email().transform((v) => v.trim().toLowerCase()),
  password: z.string().min(1),
});

router.post("/login", zValidator("json", loginSchema), async (c) => {
  const db = c.get("db");
  const body = c.req.valid("json");

  const userRows = await db.select().from(users).where(
    and(eq(users.email, body.email), eq(users.authProvider, "local"))
  ).limit(1);

  if (userRows.length === 0) {
    unauthorized("Nieprawidłowy e-mail lub hasło");
  }

  const user = userRows[0];

  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(body.password));
  const hashedPassword = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");

  if (user.hashedPassword !== hashedPassword) {
    unauthorized("Nieprawidłowy e-mail lub hasło");
  }

  if (!user.isActive) unauthorized("Konto jest deaktywowane");
  if (!user.isApproved) unauthorized("Konto wymaga zatwierdzenia przez administratora");

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

// ─── Google OAuth ───────────────────────────────────────────────────────────
//
// Flow:
// 1. Frontend loads Google Identity Services, user clicks "Sign in with Google".
// 2. Google returns an ID token (Implicit Flow — not authorization code,
//    because the frontend is a SPA and cannot keep a client secret).
// 3. Frontend POSTs { credential } (the ID token) to /google-login.
// 4. Backend verifies the ID token with Google's tokeninfo endpoint,
//    checks the email domain is @agh.edu.pl, and creates/updates the user.
// 5. Backend returns a pz-worker JWT.

// Environment variable: DEV_BYPASS_AUTH
// When set to anything truthy ("true", "1"), the Google token verification
// is SKIPPED and the backend trusts the email sent by the frontend.
// This is for development/demo only — NEVER set in production.

interface GoogleIdToken {
  iss: string;        // "https://accounts.google.com" or "accounts.google.com"
  sub: string;        // Google user ID
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  hd?: string;        // hosted domain (Google Workspace)
}

const googleLoginSchema = z.object({
  credential: z.string().min(1),  // Google ID token (or dev bypass email)
});

router.post("/google-login", zValidator("json", googleLoginSchema), async (c) => {
  const db = c.get("db");
  const { credential } = c.req.valid("json");

  let googleId: string;
  let email: string;

  // ── Dev bypass ────────────────────────────────────────────────────────
  const devBypass = c.env.DEV_BYPASS_AUTH === "true" || c.env.DEV_BYPASS_AUTH === "1";
  if (devBypass) {
    // credential is treated as a plain email address for dev convenience
    email = credential.trim().toLowerCase();
    // Validate it looks like an email
    if (!email.includes("@")) {
      badRequest("DEV_BYPASS_AUTH is enabled — credential must be an email address");
    }
    // Generate a fake stable google ID from the email
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(email));
    googleId = "dev-" + Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
  }
  // ── Production: verify Google ID token ─────────────────────────────────
  else {
    try {
      // Verify ID token with Google's tokeninfo endpoint
      const verifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`;
      const verifyResp = await fetch(verifyUrl);
      if (!verifyResp.ok) {
        unauthorized("Invalid Google ID token");
      }
      const payload = await verifyResp.json() as GoogleIdToken;

      // Validate issuer
      const validIssuers = ["https://accounts.google.com", "accounts.google.com"];
      if (!validIssuers.includes(payload.iss)) {
        unauthorized("Invalid token issuer");
      }

      // Require verified email
      if (!payload.email_verified) {
        unauthorized("Email not verified by Google");
      }

      email = payload.email.trim().toLowerCase();
      googleId = payload.sub;

      // Restrict to @agh.edu.pl domain
      if (!email.endsWith("@agh.edu.pl")) {
        unauthorized("Only @agh.edu.pl Google accounts are allowed");
      }
    } catch (err) {
      // Re-throw our own AppErrors so the global onError handler can format them
      if (err instanceof HTTPException) throw err;
      console.error(JSON.stringify({ message: "Google token verification failed", error: String(err) }));
      unauthorized("Google authentication failed");
    }
  }

  // ── Upsert user ───────────────────────────────────────────────────────
  // Find existing user by googleId OR email
  let userRows = await db.select().from(users).where(
    and(eq(users.googleId, googleId), eq(users.authProvider, "google"))
  ).limit(1);

  if (userRows.length === 0) {
    // Check if email exists with different provider
    const emailRows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (emailRows.length > 0) {
      const existing = emailRows[0];
      // Link Google account to existing user
      await db.update(users)
        .set({ googleId, authProvider: "google" })
        .where(eq(users.id, existing.id));
      userRows = await db.select().from(users).where(eq(users.id, existing.id)).limit(1);
    } else {
      // Create new user — auto-approved for @agh.edu.pl
      const isAgh = email.endsWith("@agh.edu.pl");
      const result = await db.insert(users).values({
        email,
        googleId,
        authProvider: "google",
        hashedPassword: "google-oauth-no-password",
        isApproved: isAgh,
        role: "user",
      });
      const created = await db.select().from(users).where(eq(users.id, result[0].insertId)).limit(1);
      userRows = created;
    }
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

// ─── List users (for dropdowns) ────────────────────────────────────────────

// List users (for owners dropdown) — frontend expects GET /api/v1/auth/users
// Response: [{ id, email }]
router.get("/users", async (c) => {
  const db = c.get("db");
  const rows = await db.select({ id: users.id, email: users.email }).from(users);
  return c.json(rows);
});

// ─── Auth config (for frontend) ────────────────────────────────────────────

router.get("/config", async (c) => {
  const devBypass = c.env.DEV_BYPASS_AUTH === "true" || c.env.DEV_BYPASS_AUTH === "1";
  return c.json({
    devBypassAuth: devBypass,
    googleClientId: c.env.GOOGLE_CLIENT_ID || "",
  });
});


export { router as authRouter };
