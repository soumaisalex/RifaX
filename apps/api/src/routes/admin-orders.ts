import { Hono } from "hono";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { auditLogs, buyers, orderItems, orders, payments, raffleNumbers, raffles } from "@rifa-x/database/schema";
import { createDatabase } from "@rifa-x/database";
import { requireRole } from "../middleware/auth";
import type { AppBindings, AppVariables } from "../types";

const adminOrders = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();
adminOrders.use("*", requireRole(["SUPER_ADMIN", "ORGANIZATION_ADMIN"]));
const scope = (session: AppVariables["auth"]) => session.role === "SUPER_ADMIN" ? undefined : eq(raffles.organizationId, session.organizationId!);

adminOrders.get("/", async (c) => {
  const db = createDatabase(c.env.DATABASE_URL); const session = c.get("auth");
  const status = c.req.query("status"); const search = c.req.query("search")?.trim(); const raffleId = c.req.query("raffleId");
  const conditions = [scope(session), raffleId ? eq(orders.raffleId, raffleId) : undefined, status && status !== "ALL" ? eq(orders.status, status as any) : undefined, search ? or(ilike(buyers.name, `%${search}%`), ilike(buyers.phone, `%${search}%`), ilike(orders.id, `%${search}%`)) : undefined].filter(Boolean);
  const rows = await db.select({ id: orders.id, raffleId: orders.raffleId, raffleTitle: raffles.title, buyerName: buyers.name, buyerPhone: buyers.phone, total: orders.total, status: orders.status, reservationExpiresAt: orders.reservationExpiresAt, paymentStatus: payments.status, createdAt: orders.createdAt }).from(orders).innerJoin(raffles, eq(raffles.id, orders.raffleId)).innerJoin(buyers, eq(buyers.id, orders.buyerId)).leftJoin(payments, eq(payments.orderId, orders.id)).where(and(...conditions)).orderBy(desc(orders.createdAt)).limit(200);
  return c.json({ orders: rows });
});

adminOrders.get("/:id", async (c) => { const db = createDatabase(c.env.DATABASE_URL); const session = c.get("auth"); const id = c.req.param("id"); const [row] = await db.select({ order: orders, raffle: raffles, buyer: buyers, payment: payments }).from(orders).innerJoin(raffles, eq(raffles.id, orders.raffleId)).innerJoin(buyers, eq(buyers.id, orders.buyerId)).leftJoin(payments, eq(payments.orderId, orders.id)).where(and(eq(orders.id, id), scope(session))).limit(1); if (!row) return c.json({ error: "Order not found" }, 404); const items = await db.select({ number: raffleNumbers.number }).from(orderItems).innerJoin(raffleNumbers, eq(raffleNumbers.id, orderItems.raffleNumberId)).where(eq(orderItems.orderId, row.order.id)).orderBy(raffleNumbers.number); return c.json({ ...row, numbers: items.map(i=>i.number) }); });

adminOrders.post("/:id/confirm-payment", async (c) => updatePayment(c, "CONFIRMED"));
adminOrders.post("/:id/cancel", async (c) => updatePayment(c, "CANCELLED"));

async function updatePayment(c: Parameters<Parameters<typeof adminOrders.post>[1]>[0], paymentStatus: "CONFIRMED" | "CANCELLED") {
  const db = createDatabase(c.env.DATABASE_URL); const session = c.get("auth");
  const id = c.req.param("id");
  const [row] = await db.select({ order: orders, raffle: raffles, payment: payments }).from(orders).innerJoin(raffles, eq(raffles.id, orders.raffleId)).leftJoin(payments, eq(payments.orderId, orders.id)).where(and(eq(orders.id, id), scope(session))).limit(1);
  if (!row || !row.payment) return c.json({ error: "Order or payment not found" }, 404);
  if (row.order.status !== "PENDING" || row.payment.status !== "PENDING") return c.json({ error: "Order is not pending" }, 409);
  const now = new Date(); if (paymentStatus === "CONFIRMED" && row.order.reservationExpiresAt && row.order.reservationExpiresAt <= now) return c.json({ error: "Reservation expired" }, 409);
  await db.transaction(async tx => {
    await tx.update(payments).set({ status: paymentStatus, confirmedAt: paymentStatus === "CONFIRMED" ? now : null, confirmedBy: paymentStatus === "CONFIRMED" ? session.userId : null, updatedAt: now }).where(eq(payments.id, row.payment!.id));
    await tx.update(orders).set({ status: paymentStatus === "CONFIRMED" ? "PAID" : "CANCELLED", updatedAt: now }).where(eq(orders.id, row.order.id));
    const items = await tx.select({ raffleNumberId: orderItems.raffleNumberId }).from(orderItems).where(eq(orderItems.orderId, row.order.id));
    for (const item of items) await tx.update(raffleNumbers).set({ status: paymentStatus === "CONFIRMED" ? "SOLD" : "AVAILABLE", soldAt: paymentStatus === "CONFIRMED" ? now : null, reservationExpiresAt: null, updatedAt: now }).where(eq(raffleNumbers.id, item.raffleNumberId));
    await tx.insert(auditLogs).values({ organizationId: row.raffle.organizationId, actorUserId: session.userId, action: paymentStatus === "CONFIRMED" ? "PAYMENT_CONFIRMED" : "ORDER_CANCELLED", entityType: "ORDER", entityId: row.order.id, metadata: { paymentId: row.payment!.id, amount: row.order.total } });
  });
  return c.json({ success: true, status: paymentStatus });
}
export default adminOrders;
