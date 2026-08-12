import { Hono } from "hono";
import { and, eq, isNull, sql } from "drizzle-orm";
import { createDatabase } from "@rifa-x/database";
import { raffles, rafflePrizes, raffleNumbers } from "@rifa-x/database/schema";
import type { AppBindings, AppVariables } from "../types";

const publicRaffles = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

publicRaffles.get("/:slug", async (c) => {
  const db = createDatabase(c.env.DATABASE_URL);
  const slug = c.req.param("slug");
  if (!slug) return c.json({ error: "Raffle slug is required" }, 400);
  const raffle = await db.query.raffles.findFirst({ where: and(eq(raffles.slug, slug), eq(raffles.status, "ACTIVE"), isNull(raffles.deletedAt)) });
  if (!raffle) return c.json({ error: "Raffle not found" }, 404);
  const [available, reserved, sold] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(raffleNumbers).where(and(eq(raffleNumbers.raffleId, raffle.id), eq(raffleNumbers.status, "AVAILABLE"))),
    db.select({ count: sql<number>`count(*)` }).from(raffleNumbers).where(and(eq(raffleNumbers.raffleId, raffle.id), eq(raffleNumbers.status, "RESERVED"))),
    db.select({ count: sql<number>`count(*)` }).from(raffleNumbers).where(and(eq(raffleNumbers.raffleId, raffle.id), eq(raffleNumbers.status, "SOLD"))),
  ]);
  const prizes = await db.query.rafflePrizes.findMany({ where: and(eq(rafflePrizes.raffleId, raffle.id), isNull(rafflePrizes.deletedAt)), columns: { id: true, position: true, title: true, description: true, imageUrl: true, estimatedValue: true } });
  const soldCount = Number(sold[0]?.count ?? 0);
  return c.json({ id: raffle.id, slug: raffle.slug, title: raffle.title, description: raffle.description, bannerUrl: raffle.bannerUrl, regulation: raffle.regulation, ticketPrice: raffle.ticketPrice, numbersCount: raffle.numbersCount, drawMethod: raffle.drawMethod, drawAt: raffle.drawAt, prizes, stats: { available: Number(available[0]?.count ?? 0), reserved: Number(reserved[0]?.count ?? 0), sold: soldCount, participants: soldCount, progressPercent: raffle.numbersCount > 0 ? Math.round((soldCount / raffle.numbersCount) * 10000) / 100 : 0 } });
});

publicRaffles.get("/:slug/numbers", async (c) => {
  const db = createDatabase(c.env.DATABASE_URL);
  const slug = c.req.param("slug");
  if (!slug) return c.json({ error: "Raffle slug is required" }, 400);
  const raffle = await db.query.raffles.findFirst({ where: and(eq(raffles.slug, slug), eq(raffles.status, "ACTIVE"), isNull(raffles.deletedAt)), columns: { id: true } });
  if (!raffle) return c.json({ error: "Raffle not found" }, 404);
  const numbers = await db.select({ number: raffleNumbers.number, status: sql<string>`CASE WHEN ${raffleNumbers.status} = 'RESERVED' AND ${raffleNumbers.reservationExpiresAt} <= now() THEN 'AVAILABLE' ELSE ${raffleNumbers.status} END` }).from(raffleNumbers).where(eq(raffleNumbers.raffleId, raffle.id)).orderBy(raffleNumbers.number);
  return c.json({ numbers });
});

export default publicRaffles;
