import { Hono } from "hono";
import { and, eq, isNull } from "drizzle-orm";
import { createDatabase } from "@rifa-x/database";
import { users } from "@rifa-x/database/schema";
import type { AppBindings, AppVariables } from "../types";

const bootstrap = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

async function hashPassword(password: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

bootstrap.get("/status", async (c) => {
  const db = createDatabase(c.env.DATABASE_URL);
  const admin = await db.query.users.findFirst({
    where: and(eq(users.role, "SUPER_ADMIN"), isNull(users.deletedAt)),
    columns: { id: true },
  });

  return c.json({ bootstrapAvailable: !admin });
});

bootstrap.post("/", async (c) => {
  const body = await c.req.json<{ name?: string; email?: string; password?: string }>();
  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!name || !email || !password || password.length < 8) {
    return c.json({ error: "Name, email and password (min. 8 chars) are required" }, 400);
  }

  const db = createDatabase(c.env.DATABASE_URL);
  const existingAdmin = await db.query.users.findFirst({
    where: and(eq(users.role, "SUPER_ADMIN"), isNull(users.deletedAt)),
    columns: { id: true },
  });

  if (existingAdmin) {
    return c.json({ error: "Initial administrator has already been configured" }, 409);
  }

  try {
    const passwordHash = await hashPassword(password);
    const [user] = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash,
        role: "SUPER_ADMIN",
        status: "ACTIVE",
      })
      .returning({ id: users.id, name: users.name, email: users.email, role: users.role });

    return c.json({ user }, 201);
  } catch {
    return c.json({ error: "Unable to create initial administrator" }, 409);
  }
});

export default bootstrap;
