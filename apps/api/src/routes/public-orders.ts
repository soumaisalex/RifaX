import { Hono } from "hono";
import { createOrder } from "@rifa-x/database/services/orders";
import { generatePixPayload } from "@rifa-x/database/services/pix";
import { createDatabase } from "@rifa-x/database";
import { raffles, orders, orderItems, raffleNumbers } from "@rifa-x/database/schema";
import { eq } from "drizzle-orm";

const publicOrders = new Hono();
const PHONE = /^\(\d{2}\) \d{5}-\d{4}$/;

publicOrders.post("/:raffleId/orders", async (c) => {
  const body = await c.req.json<{ name?: string; phone?: string; numbers?: number[] }>();
  const name = body.name?.trim();
  const phone = body.phone?.trim();
  const numbers = body.numbers ?? [];
  if (!name || !phone || !PHONE.test(phone) || !numbers.length) return c.json({ error: "Invalid checkout data" }, 400);
  const db = createDatabase(c.env.DATABASE_URL);
  const raffleId = c.req.param("raffleId");
  const raffle = await db.query.raffles.findFirst({ where: eq(raffles.id, raffleId) });
  if (!raffle || raffle.status !== "ACTIVE" || !raffle.pixKey || !raffle.pixCity) return c.json({ error: "Raffle is not ready for checkout" }, 409);
  try {
    const result = await createOrder(db, { raffleId, buyerName: name, buyerPhone: phone, numbers });
    const pix = generatePixPayload({ key: raffle.pixKey, merchantName: raffle.title, merchantCity: raffle.pixCity, amount: Number(result.order.total), txid: result.order.id.replaceAll("-", "").slice(0, 25) });
    return c.json({ orderId: result.order.id, publicToken: result.publicToken, numbers: result.numbers, total: result.order.total, reservationExpiresAt: result.order.reservationExpiresAt, pix: { payload: pix } }, 201);
  } catch (error) { return c.json({ error: error instanceof Error ? error.message : "Unable to create order" }, 409); }
});

publicOrders.get("/orders/:token", async (c) => {
  const token = c.req.param("token");
  if (!token || token.length < 32) return c.json({ error: "Invalid token" }, 400);
  const db = createDatabase(c.env.DATABASE_URL);
  const [order] = await db.select({ id: orders.id, raffleId: orders.raffleId, status: orders.status, total: orders.total, reservationExpiresAt: orders.reservationExpiresAt, raffleTitle: raffles.title, pixKey: raffles.pixKey, pixCity: raffles.pixCity }).from(orders).innerJoin(raffles, eq(raffles.id, orders.raffleId)).where(eq(orders.publicTokenHash, await sha256(token))).limit(1);
  if (!order) return c.json({ error: "Order not found" }, 404);
  const items = await db.select({ number: raffleNumbers.number }).from(orderItems).innerJoin(raffleNumbers, eq(raffleNumbers.id, orderItems.raffleNumberId)).where(eq(orderItems.orderId, order.id)).orderBy(raffleNumbers.number);
  const expired = order.status === "PENDING" && order.reservationExpiresAt <= new Date();
  if (expired) return c.json({ orderId: order.id, raffleId: order.raffleId, raffleTitle: order.raffleTitle, status: "EXPIRED", numbers: items.map((x) => x.number), total: order.total, reservationExpiresAt: order.reservationExpiresAt });
  const pix = order.pixKey && order.pixCity && order.status === "PENDING" ? generatePixPayload({ key: order.pixKey, merchantName: order.raffleTitle, merchantCity: order.pixCity, amount: Number(order.total), txid: order.id.replaceAll("-", "").slice(0, 25) }) : null;
  return c.json({ orderId: order.id, raffleId: order.raffleId, raffleTitle: order.raffleTitle, status: order.status, numbers: items.map((x) => x.number), total: order.total, reservationExpiresAt: order.reservationExpiresAt, pix: pix ? { payload: pix } : null });
});

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export default publicOrders;
