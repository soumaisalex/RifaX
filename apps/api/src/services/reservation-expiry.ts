import { and, eq, lte } from "drizzle-orm";
import { createDatabase } from "@rifa-x/database";
import { orders, payments, orderItems, raffleNumbers } from "@rifa-x/database/schema";

export async function expireReservations(databaseUrl: string) {
  const db = createDatabase(databaseUrl);
  const now = new Date();

  const pending = await db.query.orders.findMany({
    where: and(eq(orders.status, "PENDING"), lte(orders.reservationExpiresAt, now)),
    columns: { id: true },
  });

  let expired = 0;
  for (const order of pending) {
    await db.transaction(async (tx) => {
      const result = await tx.update(orders)
        .set({ status: "EXPIRED", updatedAt: now })
        .where(and(eq(orders.id, order.id), eq(orders.status, "PENDING")));

      if (result.rowCount !== 1) return;

      await tx.update(payments)
        .set({ status: "CANCELLED", updatedAt: now })
        .where(and(eq(payments.orderId, order.id), eq(payments.status, "PENDING")));

      const items = await tx.select({ raffleNumberId: orderItems.raffleNumberId })
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));

      for (const item of items) {
        await tx.update(raffleNumbers)
          .set({ status: "AVAILABLE", reservationExpiresAt: null, updatedAt: now })
          .where(and(eq(raffleNumbers.id, item.raffleNumberId), eq(raffleNumbers.status, "RESERVED")));
      }

      expired++;
    });
  }

  return { expired };
}
