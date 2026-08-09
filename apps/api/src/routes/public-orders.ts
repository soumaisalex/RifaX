import { Hono } from "hono";
import { createOrder } from "@rifa-x/database/services/orders";
import { generatePixPayload } from "@rifa-x/database/services/pix";
import { createDatabase } from "@rifa-x/database";
import { raffles } from "@rifa-x/database/schema";
import { eq } from "drizzle-orm";

const publicOrders = new Hono();

publicOrders.post("/:raffleId/orders", async (c) => {
  const body = await c.req.json<{ name?: string; phone?: string; numbers?: number[] }>();
  const name = body.name?.trim();
  const phone = body.phone?.trim();
  const numbers = body.numbers ?? [];

  if (!name || !phone || numbers.length === 0) {
    return c.json({ error: "Name, phone and numbers are required" }, 400);
  }
  if (!/^\(\d{2}\) \d{5}-\d{4}$/.test(phone)) {
    return c.json({ error: "Invalid phone format" }, 400);
  }

  const db = createDatabase(c.env.DATABASE_URL);
  const raffleId = c.req.param("raffleId");
  const raffle = await db.query.raffles.findFirst({ where: eq(raffles.id, raffleId) });
  if (!raffle || raffle.status !== "ACTIVE" || !raffle.pixKey || !raffle.pixCity) {
    return c.json({ error: "Raffle is not ready for checkout" }, 409);
  }

  try {
    const result = await createOrder(db, { raffleId, buyerName: name, buyerPhone: phone, numbers });
    const pixPayload = generatePixPayload({ key: raffle.pixKey, merchantName: raffle.title, merchantCity: raffle.pixCity, amount: Number(result.order.total), txid: result.order.id.replaceAll("-", "").slice(0, 25) });
    return c.json({ orderId: result.order.id, publicToken: result.publicToken, numbers: result.numbers, total: result.order.total, reservationExpiresAt: result.order.reservationExpiresAt, pix: { payload: pixPayload } }, 201);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : "Unable to create order" }, 409);
  }
});

export default publicOrders;
