import { Hono } from "hono";
import { and, eq, isNull, sql } from "drizzle-orm";
import { createDatabase } from "@rifa-x/database";
import { raffles, raffleNumbers, rafflePrizes } from "@rifa-x/database/schema";
import { requireRole } from "../middleware/auth";

type Auth = { userId: string; role: "OWNER" | "ADMIN" };
const adminRaffles = new Hono();
const auth = (c: any) => c.get("auth") as Auth;
const canAccess = (ownerId: string, session: Auth) => session.role === "OWNER" || ownerId === session.userId;

adminRaffles.use("*", requireRole(["OWNER", "ADMIN"]));

adminRaffles.get("/", async (c) => {
  const db = createDatabase(c.env.DATABASE_URL);
  const session = auth(c);
  const rows = await db.query.raffles.findMany({
    where: and(isNull(raffles.deletedAt), session.role === "OWNER" ? undefined : eq(raffles.ownerId, session.userId)),
    columns: { id: true, ownerId: true, slug: true, title: true, description: true, status: true, ticketPrice: true, numbersCount: true, drawMethod: true, drawAt: true, pixKey: true, pixCity: true, bannerUrl: true, createdAt: true, updatedAt: true },
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });
  return c.json({ raffles: rows });
});

adminRaffles.post("/", async (c) => {
  const db = createDatabase(c.env.DATABASE_URL); const session = auth(c);
  const body = await c.req.json<{ title?: string; slug?: string; description?: string; ticketPrice?: string; numbersCount?: number; drawMethod?: string; drawAt?: string; pixKey?: string; pixCity?: string; bannerUrl?: string; prizes?: { title: string; description?: string; imageUrl?: string }[] }>();
  if (!body.title?.trim() || !body.slug?.trim() || !body.ticketPrice || !Number.isInteger(body.numbersCount) || body.numbersCount < 1 || !body.pixKey?.trim() || !body.pixCity?.trim()) return c.json({ error: "Invalid raffle data" }, 400);
  try {
    const raffle = await db.transaction(async (tx) => {
      const [created] = await tx.insert(raffles).values({ ownerId: session.userId, title: body.title.trim(), slug: body.slug.trim().toLowerCase(), description: body.description?.trim() || null, ticketPrice: body.ticketPrice, numbersCount: body.numbersCount!, drawMethod: body.drawMethod ?? "INTERNAL", drawAt: body.drawAt ? new Date(body.drawAt) : null, pixKey: body.pixKey.trim(), pixCity: body.pixCity.trim(), bannerUrl: body.bannerUrl?.trim() || null, status: "DRAFT" }).returning();
      await tx.insert(raffleNumbers).values(Array.from({ length: body.numbersCount! }, (_, i) => ({ raffleId: created.id, number: i + 1, status: "AVAILABLE" })));
      if (body.prizes?.length) await tx.insert(rafflePrizes).values(body.prizes.map((p, i) => ({ raffleId: created.id, position: i + 1, title: p.title.trim(), description: p.description?.trim() || null, imageUrl: p.imageUrl?.trim() || null })));
      return created;
    });
    return c.json({ raffle }, 201);
  } catch { return c.json({ error: "Unable to create raffle" }, 409); }
});

adminRaffles.patch("/:id", async (c) => {
  const db = createDatabase(c.env.DATABASE_URL); const session = auth(c); const id = c.req.param("id");
  const existing = await db.query.raffles.findFirst({ where: and(eq(raffles.id, id), isNull(raffles.deletedAt)) });
  if (!existing || !canAccess(existing.ownerId, session)) return c.json({ error: "Not found" }, 404);
  if (existing.status === "FINISHED") return c.json({ error: "Finished raffles cannot be edited" }, 409);
  const body = await c.req.json<Record<string, unknown>>();
  const allowed = ["title", "slug", "description", "ticketPrice", "drawMethod", "drawAt", "pixKey", "pixCity", "bannerUrl"] as const;
  const patch: Record<string, unknown> = {};
  for (const key of allowed) if (body[key] !== undefined) patch[key] = key === "slug" || key === "title" || key === "pixKey" || key === "pixCity" ? String(body[key]).trim() : body[key];
  const [raffle] = await db.update(raffles).set({ ...patch, updatedAt: new Date() }).where(eq(raffles.id, id)).returning();
  return c.json({ raffle });
});

adminRaffles.delete("/:id", async (c) => {
  const db = createDatabase(c.env.DATABASE_URL); const session = auth(c); const id = c.req.param("id");
  const existing = await db.query.raffles.findFirst({ where: and(eq(raffles.id, id), isNull(raffles.deletedAt)) });
  if (!existing || !canAccess(existing.ownerId, session)) return c.json({ error: "Not found" }, 404);
  await db.update(raffles).set({ deletedAt: new Date(), updatedAt: new Date(), status: "ARCHIVED" }).where(eq(raffles.id, id));
  return c.body(null, 204);
});

adminRaffles.post("/:id/publish", async (c) => {
  const db = createDatabase(c.env.DATABASE_URL); const session = auth(c); const id = c.req.param("id");
  const existing = await db.query.raffles.findFirst({ where: and(eq(raffles.id, id), isNull(raffles.deletedAt)) });
  if (!existing || !canAccess(existing.ownerId, session)) return c.json({ error: "Not found" }, 404);
  const [raffle] = await db.update(raffles).set({ status: "ACTIVE", updatedAt: new Date() }).where(eq(raffles.id, id)).returning();
  return c.json({ raffle });
});

export default adminRaffles;
