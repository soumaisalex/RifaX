import { Hono } from "hono";
import { createOrder } from "@rifa-x/database/services/orders";
import { generatePixPayload } from "@rifa-x/database/services/pix";
import { createDatabase } from "@rifa-x/database";
import { raffles, orders, orderItems, raffleNumbers, payments, buyers } from "@rifa-x/database/schema";
import { and, desc, eq } from "drizzle-orm";
import type { AppBindings, AppVariables } from "../types";

const publicOrders = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();
const PHONE = /^\(\d{2}\) \d{5}-\d{4}$/;

publicOrders.post("/raffles/:raffleId/orders", async (c) => {
  const body = await c.req.json<{ name?: string; phone?: string; numbers?: number[] }>();
  const name = body.name?.trim(); const phone = body.phone?.trim(); const numbers = [...new Set(body.numbers ?? [])];
  if (!name || name.length > 160 || !phone || !PHONE.test(phone) || !numbers.length || numbers.length > 1000 || numbers.some(n => !Number.isInteger(n) || n < 1)) return c.json({ error: "Invalid checkout data" }, 400);
  const db = createDatabase(c.env.DATABASE_URL); const raffleId = c.req.param("raffleId");
  if (!raffleId) return c.json({ error: "Raffle id is required" }, 400);
  const raffle = await db.query.raffles.findFirst({ where: and(eq(raffles.id, raffleId), eq(raffles.status, "ACTIVE")) });
  if (!raffle || !raffle.pixKey || !raffle.pixCity) return c.json({ error: "Raffle is not ready for checkout" }, 409);
  try {
    const result = await createOrder(db, { raffleId, buyerName: name, buyerPhone: phone, numbers });
    const pix = generatePixPayload({ key: raffle.pixKey, merchantName: raffle.title, merchantCity: raffle.pixCity, amount: Number(result.order.total), txid: result.order.id.replaceAll("-", "").slice(0, 25) });
    await db.insert(payments).values({ orderId: result.order.id, method: "PIX", status: "PENDING", amount: result.order.total, pixPayload: pix });
    return c.json({ orderId: result.order.id, publicToken: result.publicToken, numbers: result.numbers, total: result.order.total, reservationExpiresAt: result.order.reservationExpiresAt, pix: { payload: pix } }, 201);
  } catch (error) { return c.json({ error: error instanceof Error ? error.message : "Unable to create order" }, 409); }
});

publicOrders.get("/orders/:token", async (c) => {
  const token = c.req.param("token"); if (!token || token.length < 32) return c.json({ error: "Invalid token" }, 400);
  const db = createDatabase(c.env.DATABASE_URL); const hash = await sha256(token);
  const [order] = await db.select({ id: orders.id, raffleId: orders.raffleId, status: orders.status, total: orders.total, reservationExpiresAt: orders.reservationExpiresAt, raffleTitle: raffles.title, paymentStatus: payments.status, pixPayload: payments.pixPayload }).from(orders).innerJoin(raffles, eq(raffles.id, orders.raffleId)).leftJoin(payments, eq(payments.orderId, orders.id)).where(eq(orders.publicTokenHash, hash)).limit(1);
  if (!order) return c.json({ error: "Order not found" }, 404);
  const items = await db.select({ number: raffleNumbers.number }).from(orderItems).innerJoin(raffleNumbers, eq(raffleNumbers.id, orderItems.raffleNumberId)).where(eq(orderItems.orderId, order.id)).orderBy(raffleNumbers.number);
  const expired = order.status === "PENDING" && !!order.reservationExpiresAt && order.reservationExpiresAt <= new Date();
  return c.json({ orderId: order.id, raffleId: order.raffleId, raffleTitle: order.raffleTitle, status: expired ? "EXPIRED" : order.status, paymentStatus: order.paymentStatus, numbers: items.map(x=>x.number), total: order.total, reservationExpiresAt: order.reservationExpiresAt, pix: !expired && order.status === "PENDING" ? { payload: order.pixPayload } : null });
});

publicOrders.get("/orders/by-phone/:phone", async (c) => {
  const phone = decodeURIComponent(c.req.param("phone"));
  if (!PHONE.test(phone)) return c.json({ error: "Invalid phone" }, 400);
  const db = createDatabase(c.env.DATABASE_URL);
  const rows = await db.select({ id: orders.id, raffleId: orders.raffleId, raffleTitle: raffles.title, status: orders.status, total: orders.total, createdAt: orders.createdAt }).from(orders).innerJoin(raffles, eq(raffles.id, orders.raffleId)).innerJoin(buyers, eq(buyers.id, orders.buyerId)).where(eq(buyers.phone, phone)).orderBy(desc(orders.createdAt)).limit(20);
  const purchases = await Promise.all(rows.map(async order => {
    const items = await db.select({ number: raffleNumbers.number }).from(orderItems).innerJoin(raffleNumbers, eq(raffleNumbers.id, orderItems.raffleNumberId)).where(eq(orderItems.orderId, order.id)).orderBy(raffleNumbers.number);
    return { ...order, numbers: items.map(x => x.number) };
  }));
  return c.json({ purchases });
});

async function sha256(value: string) { const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return Array.from(new Uint8Array(digest)).map(byte=>byte.toString(16).padStart(2,"0")).join(""); }
export default publicOrders;
