import { Hono } from "hono";
import { and, asc, eq, sql } from "drizzle-orm";
import { createDatabase } from "@rifa-x/database";
import { raffleNumbers, raffles } from "@rifa-x/database/schema";

const publicNumbers = new Hono();
const MAX_LIMIT = 100;

publicNumbers.get("/:raffleId/numbers", async (c) => {
  const db = createDatabase(c.env.DATABASE_URL);
  const raffleId = c.req.param("raffleId");
  const page = Math.max(Number(c.req.query("page") ?? "1"), 1);
  const requestedLimit = Number(c.req.query("limit") ?? "50");
  const limit = Math.min(Math.max(requestedLimit || 50, 1), MAX_LIMIT);
  const offset = (page - 1) * limit;

  const raffle = await db.query.raffles.findFirst({
    where: and(eq(raffles.id, raffleId), eq(raffles.status, "ACTIVE")),
    columns: { id: true, numbersCount: true },
  });

  if (!raffle) return c.json({ error: "Raffle not found" }, 404);

  const numbers = await db
    .select({ number: raffleNumbers.number, status: raffleNumbers.status })
    .from(raffleNumbers)
    .where(eq(raffleNumbers.raffleId, raffleId))
    .orderBy(asc(raffleNumbers.number))
    .limit(limit)
    .offset(offset);

  const [count] = await db
    .select({ count: sql<number>`count(*)` })
    .from(raffleNumbers)
    .where(eq(raffleNumbers.raffleId, raffleId));

  const total = Number(count?.count ?? 0);

  return c.json({
    raffleId,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    numbers,
  });
});

export default publicNumbers;
