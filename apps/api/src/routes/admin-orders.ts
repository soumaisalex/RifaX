import { Hono } from "hono";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { createDatabase } from "@rifa-x/database";
import { orderItems, orders, raffleNumbers, raffles } from "@rifa-x/database/schema";
import { requireRole } from "../middleware/auth";

const adminOrders = new Hono();
adminOrders.use("*", requireRole(["OWNER", "ADMIN"]));

adminOrders.get("/", async (c) => {
  const db = createDatabase(c.env.DATABASE_URL);
  const session = c.get("auth") as { userId: string; role: "OWNER" | "ADMIN" };
  const status = c.req.query("status");
  const search = c.req.query("search")?.trim();
  const raffleId = c.req.query("raffleId");

  const conditions = [
    session.role === "OWNER" ? undefined : eq(raffles.ownerId, session.userId),
    raffleId ? eq(orders.raffleId, raffleId) : undefined,
    status && status !== "ALL" ? eq(orders.status, status as any) : undefined,
    search ? or(ilike(orders.buyerName, `%${search}%`), ilike(orders.buyerPhone, `%${search}%`), ilike(orders.id, `%${search}%`)) : undefined,
  ].filter(Boolean);

  const rows = await db.select({
    id: orders.id,
    raffleId: orders.raffleId,
    raffleTitle: raffles.title,
    buyerName: orders.buyerName,
    buyerPhone: orders.buyerPhone,
    total: orders.total,
    status: orders.status,
    reservationExpiresAt: orders.reservationExpiresAt,
    createdAt: orders.createdAt,
  }).from(orders).innerJoin(raffles, eq(raffles.id, orders.raffleId)).where(and(...conditions)).orderBy(desc(orders.createdAt)).limit(200);

  return c.json({ orders: rows });
});

adminOrders.get("/:id", async (c) => {
  const db = createDatabase(c.env.DATABASE_URL);
  const session = c.get("auth") as { userId: string; role: "OWNER" | "ADMIN" };
  const [order] = await db.select({ order: orders, raffle: raffles }).from(orders).innerJoin(raffles, eq(raffles.id, orders.raffleId)).where(and(eq(orders.id, c.req.param("id")), session.role === "OWNER" ? undefined : eq(raffles.ownerId, session.userId))).limit(1);
  if (!order) return c.json({ error: "Order not found" }, 404);
  const numbers = await db.select({ number: raffleNumbers.number }).from(orderItems).innerJoin(raffleNumbers, eq(raffleNumbers.id, orderItems.raffleNumberId)).where(eq(orderItems.orderId, order.order.id)).orderBy(raffleNumbers.number);
  return c.json({ ...order, numbers: numbers.map((n) => n.number) });
});

adminOrders.post("/:id/confirm-payment", async (c) => updatePaymentStatus(c, "PAID"));
adminOrders.post("/:id/cancel", async (c) => updatePaymentStatus(c, "CANCELLED"));

async function updatePaymentStatus(c: any, status: "PAID" | "CANCELLED") {
  const db = createDatabase(c.env.DATABASE_URL);
  const session = c.get("auth") as { userId: string; role: "OWNER" | "ADMIN" };
  const [found] = await db.select({ order: orders, raffle: raffles }).from(orders).innerJoin(raffles, eq(raffles.id, orders.raffleId)).where(and(eq(orders.id, c.req.param("id")), session.role === "OWNER" ? undefined : eq(raffles.ownerId, session.userId))).limit(1);
  if (!found) return c.json({ error: "Order not found" }, 404);
  if (found.order.status !== "PENDING") return c.json({ error: "Order is not pending" }, 409);

  const now = new Date();
  if (status === "PAID" && found.order.reservationExpiresAt <= now) return c.json({ error: "Reservation expired" }, 409);

  await db.transaction(async (tx) => {
    await tx.update(orders).set({ status, paidAt: status === "PAID" ? now : null, updatedAt: now }).where(eq(orders.id, found.order.id));
    if (status === "CANCELLED") {
      const items = await tx.select({ raffleNumberId: orderItems.raffleNumberId }).from(orderItems).where(eq(orderItems.orderId, found.order.id));
      for (const item of items) await tx.update(raffleNumbers).set({ status: "AVAILABLE", updatedAt: now }).where(eq(raffleNumbers.id, item.raffleNumberId));
    } else {
      const items = await tx.select({ raffleNumberId: orderItems.raffleNumberId }).from(orderItems).where(eq(orderItems.orderId, found.order.id));
      for (const item of items) await tx.update(raffleNumbers).set({ status: "SOLD", updatedAt: now }).where(eq(raffleNumbers.id, item.raffleNumberId));
    }
  });
  return c.json({ success: true, status });
}

export default adminOrders;
