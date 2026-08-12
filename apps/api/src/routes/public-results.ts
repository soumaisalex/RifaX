import { Hono } from "hono";
import { and, eq, isNull } from "drizzle-orm";
import { createDatabase } from "@rifa-x/database";
import { raffles, draws, drawWinners, rafflePrizes, raffleNumbers, buyers } from "@rifa-x/database/schema";

const app = new Hono<{ Bindings: { DATABASE_URL: string } }>();

app.get("/raffles/:raffleId/result", async c => {
  const db = createDatabase(c.env.DATABASE_URL);
  const raffleId = c.req.param("raffleId");
  const raffle = await db.query.raffles.findFirst({
    where: and(eq(raffles.id, raffleId), isNull(raffles.deletedAt)),
    columns: { id: true, status: true },
  });
  if (!raffle) return c.json({ error: "Raffle not found" }, 404);

  const draw = await db.query.draws.findFirst({
    where: eq(draws.raffleId, raffleId),
    orderBy: (d, { desc }) => [desc(d.executedAt)],
  });
  if (!draw) return c.json({ error: "Result not available" }, 404);

  const winners = await db
    .select({
      position: drawWinners.position,
      number: raffleNumbers.number,
      buyerName: buyers.name,
      prize: rafflePrizes.title,
    })
    .from(drawWinners)
    .leftJoin(rafflePrizes, eq(rafflePrizes.id, drawWinners.rafflePrizeId))
    .leftJoin(raffleNumbers, eq(raffleNumbers.id, drawWinners.raffleNumberId))
    .leftJoin(buyers, eq(buyers.id, drawWinners.buyerId))
    .where(eq(drawWinners.drawId, draw.id))
    .orderBy(drawWinners.position);

  return c.json({ status: raffle.status, executedAt: draw.executedAt, method: draw.method, winners });
});

export default app;
