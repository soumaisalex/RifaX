import { Hono } from "hono";
import { and, eq, sql } from "drizzle-orm";
import { createDatabase } from "@rifa-x/database";
import { raffles, rafflePrizes, raffleNumbers } from "@rifa-x/database/schema";

const publicRaffles = new Hono();

publicRaffles.get("/:slug", async (c) => {
  const db = createDatabase(c.env.DATABASE_URL);
  const slug = c.req.param("slug");

  const raffle = await db.query.raffles.findFirst({
    where: and(eq(raffles.slug, slug), eq(raffles.status, "ACTIVE")),
  });

  if (!raffle) return c.json({ error: "Raffle not found" }, 404);

  const [available, reserved, sold] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(raffleNumbers).where(and(eq(raffleNumbers.raffleId, raffle.id), eq(raffleNumbers.status, "AVAILABLE"))),
    db.select({ count: sql<number>`count(*)` }).from(raffleNumbers).where(and(eq(raffleNumbers.raffleId, raffle.id), eq(raffleNumbers.status, "RESERVED"))),
    db.select({ count: sql<number>`count(*)` }).from(raffleNumbers).where(and(eq(raffleNumbers.raffleId, raffle.id), eq(raffleNumbers.status, "SOLD"))),
  ]);

  const prizes = await db.query.rafflePrizes.findMany({
    where: and(eq(rafflePrizes.raffleId, raffle.id), sql`${rafflePrizes.deletedAt} IS NULL`),
    columns: { id: true, position: true, title: true, description: true, imageUrl: true, estimatedValue: true },
  });

  const availableCount = Number(available[0]?.count ?? 0);
  const reservedCount = Number(reserved[0]?.count ?? 0);
  const soldCount = Number(sold[0]?.count ?? 0);

  return c.json({
    id: raffle.id,
    slug: raffle.slug,
    title: raffle.title,
    description: raffle.description,
    bannerUrl: raffle.bannerUrl,
    regulation: raffle.regulation,
    ticketPrice: raffle.ticketPrice,
    numbersCount: raffle.numbersCount,
    drawMethod: raffle.drawMethod,
    drawAt: raffle.drawAt,
    prizes,
    stats: {
      available: availableCount,
      reserved: reservedCount,
      sold: soldCount,
      participants: soldCount,
      progressPercent: raffle.numbersCount > 0 ? Math.round((soldCount / raffle.numbersCount) * 10000) / 100 : 0,
    },
  });
});

export default publicRaffles;
