import type { Context, Next } from "hono";

export type AppRole = "OWNER" | "ADMIN";
export type AuthSession = { userId: string; role: AppRole; expiresAt: number };

const encoder = new TextEncoder();

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function createSession(session: AuthSession, secret: string) {
  const payload = btoa(JSON.stringify(session)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${payload}.${await sign(payload, secret)}`;
}

export async function verifySession(token: string | undefined, secret: string): Promise<AuthSession | null> {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || signature !== await sign(payload, secret)) return null;
  try {
    const session = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as AuthSession;
    if (!session.userId || !["OWNER", "ADMIN"].includes(session.role) || session.expiresAt <= Date.now()) return null;
    return session;
  } catch { return null; }
}

export function requireRole(roles: AppRole[]) {
  return async (c: Context, next: Next) => {
    const session = await verifySession(c.req.header("Authorization")?.replace(/^Bearer\s+/i, ""), c.env.SESSION_SECRET);
    if (!session || !roles.includes(session.role)) return c.json({ error: "Unauthorized" }, 401);
    c.set("auth", session);
    await next();
  };
}
