import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { buyers, orderItems, orders, raffleNumbers, raffles } from "../schema/core.js";
import type { Database } from "../client.js";

const RESERVATION_MINUTES = 10;

export type CreateOrderInput = {
  raffleId: string;
  buyerName: string;
  buyerPhone: string;
  numbers: number[];
};

export async function createOrder(db: Database, input: CreateOrderInput) {
  if (input.numbers.length === 0) throw new Error("At least one number is required");
  if (new Set(input.numbers).size !== input.numbers.length) throw new Error("Duplicate numbers are not allowed");

  return db.transaction(async (tx) => {
    const raffle = await tx.query.raffles.findFirst({
      where: and(eq(raffles.id, input.raffleId), eq(raffles.status, "ACTIVE")),
    });
    if (!raffle) throw new Error("Raffle is not available");

    const expiresAt = new Date(Date.now() + RESERVATION_MINUTES * 60_000);
    const selected = await tx
      .update(raffleNumbers)
      .set({ status: "RESERVED", reservationExpiresAt: expiresAt, updatedAt: new Date() })
      .where(
        and(
          eq(raffleNumbers.raffleId, input.raffleId),
          inArray(raffleNumbers.number, input.numbers),
          sql`(${raffleNumbers.status} = 'AVAILABLE' OR (${raffleNumbers.status} = 'RESERVED' AND ${raffleNumbers.reservationExpiresAt} <= now()))`,
        ),
      )
      .returning({ id: raffleNumbers.id, number: raffleNumbers.number });

    if (selected.length !== input.numbers.length) {
      throw new Error("One or more selected numbers are no longer available");
    }

    const [buyer] = await tx.insert(buyers).values({ name: input.buyerName, phone: input.buyerPhone }).returning();
    const total = (Number(raffle.ticketPrice) * selected.length).toFixed(2);
    const tokenSeed = crypto.randomUUID() + crypto.randomUUID();
    const tokenHash = await sha256(tokenSeed);

    const [order] = await tx.insert(orders).values({
      raffleId: input.raffleId,
      buyerId: buyer.id,
      publicTokenHash: tokenHash,
      status: "PENDING",
      subtotal: total,
      total,
      reservationExpiresAt: expiresAt,
    }).returning();

    await tx.insert(orderItems).values(selected.map((number) => ({
      orderId: order.id,
      raffleNumberId: number.id,
      unitPrice: raffle.ticketPrice,
    })));

    return { order, publicToken: tokenSeed, numbers: selected.map((item) => item.number) };
  });
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
