import { Hono } from "hono";
import { and, eq, isNull } from "drizzle-orm";
import { createDatabase } from "@rifa-x/database";
import { raffles, rafflePrizes } from "@rifa-x/database/schema";

const admin = new Hono();

function requireAdmin(c: any) {
  const role = c.req.header("x-rifa-role");
  if (role !== "ADMIN" && role !== "OWNER") return false;
  return true;
}

admin.get("/raffles", async (c) => {
  if (!requireAdmin(c)) return c.json({ error: "Unauthorized" }, 401);
  const db = createDatabase(c.env.DATABASE_URL);
  const rows = await db.query.raffles.findMany({
    where: isNull(raffles.deletedAt),
    columns: { id: true, slug: true, title: true, status: true, ticketPrice: true, numbersCount: true, drawAt: true, createdAt: true },
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });
  return c.json({ raffles: rows });
});

admin.post("/raffles", async (c) => {
  if (!requireAdmin(c)) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json<{ title?: string; slug?: string; description?: string; ticketPrice?: string; numbersCount?: number; drawMethod?: string; drawAt?: string; pixKey?: string; pixCity?: string; prizes?: { title: string; description?: string; imageUrl?: string }[] }>();
  if (!body.title?.trim() || !body.slug?.trim() || !body.ticketPrice || !body.numbersCount || body.numbersCount < 1) return c.json({ error: "Invalid raffle data" }, 400);
  if (!body.pixKey?.trim() || !body.pixCity?.trim()) return c.json({ error: "Pix configuration is required" }, 400);

  const db = createDatabase(c.env.DATABASE_URL);
  try {
    const raffle = await db.transaction(async (tx) => {
      const [created] = await tx.insert(raffles).values({
        title: body.title.trim(), slug: body.slug.trim().toLowerCase(), description: body.description?.trim() || null,
        ticketPrice: body.ticketPrice, numbersCount: body.numbersCount, drawMethod: body.drawMethod ?? "INTERNAL",
        drawAt: body.drawAt ? new Date(body.drawAt) : null, pixKey: body.pixKey.trim(), pixCity: body.pixCity.trim(), status: "DRAFT",
      }).returning();
      if (body.prizes?.length) await tx.insert(rafflePrizes).values(body.prizes.map((prize, index) => ({ raffleId: created.id, position: index + 1, title: prize.title.trim(), description: prize.description?.trim() || null, imageUrl: prize.imageUrl?.trim() || null })));
      return created;
    });
    return c.json({ raffle }, 201);
  } catch { return c.json({ error: "Unable to create raffle" }, 409); }
});

admin.post("/raffles/:id/publish", async (c) => {
  if (!requireAdmin(c)) return c.json({ error: "Unauthorized" }, 401);
  const db = createDatabase(c.env.DATABASE_URL);
  const [raffle] = await db.update(raffles).set({ status: "ACTIVE", updatedAt: new Date() }).where(and(eq(raffles.id, c.req.param("id")), isNull(raffles.deletedAt))).returning();
  if (!raffle) return c.json({ error: "Raffle not found" }, 404);
  return c.json({ raffle });
});

export default admin;
