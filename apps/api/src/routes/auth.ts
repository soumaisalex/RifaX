import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { createDatabase } from "@rifa-x/database";
import { users } from "@rifa-x/database/schema";
import { createSession, requireRole } from "../middleware/auth";

const auth = new Hono();

async function hashPassword(password: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function timingSafeEqual(a: string, b: string) {
  const aa = new TextEncoder().encode(a); const bb = new TextEncoder().encode(b);
  if (aa.length !== bb.length) return false;
  let diff = 0; for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i];
  return diff === 0;
}

auth.post("/login", async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>();
  if (!body.email || !body.password) return c.json({ error: "Email and password are required" }, 400);
  const db = createDatabase(c.env.DATABASE_URL);
  const user = await db.query.users.findFirst({ where: eq(users.email, body.email.trim().toLowerCase()) });
  const passwordHash = await hashPassword(body.password);
  if (!user || user.deletedAt || !user.active || !(await timingSafeEqual(passwordHash, user.passwordHash))) return c.json({ error: "Invalid credentials" }, 401);
  const token = await createSession({ userId: user.id, role: user.role, expiresAt: Date.now() + 8 * 60 * 60 * 1000 }, c.env.SESSION_SECRET);
  return c.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

auth.get("/me", requireRole(["OWNER", "ADMIN"]), async (c) => c.json({ user: c.get("auth") }));

auth.get("/admins", requireRole(["OWNER"]), async (c) => {
  const db = createDatabase(c.env.DATABASE_URL);
  const rows = await db.query.users.findMany({ where: and(eq(users.role, "ADMIN"), eq(users.active, true)), columns: { id: true, name: true, email: true, active: true, createdAt: true } });
  return c.json({ admins: rows });
});

auth.post("/admins", requireRole(["OWNER"]), async (c) => {
  const body = await c.req.json<{ name?: string; email?: string; password?: string }>();
  if (!body.name?.trim() || !body.email?.trim() || !body.password || body.password.length < 8) return c.json({ error: "Name, email and password (min. 8 chars) are required" }, 400);
  const db = createDatabase(c.env.DATABASE_URL);
  try {
    const [user] = await db.insert(users).values({ name: body.name.trim(), email: body.email.trim().toLowerCase(), passwordHash: await hashPassword(body.password), role: "ADMIN", active: true }).returning({ id: users.id, name: users.name, email: users.email, role: users.role });
    return c.json({ user }, 201);
  } catch { return c.json({ error: "Unable to create administrator" }, 409); }
});

export default auth;
