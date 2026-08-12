import { and, eq, inArray, or, sql } from "drizzle-orm";
import { raffleNumbers } from "../schema/core.js";
import type { Database } from "../client.js";

export type ReservationResult = {
  numberIds: string[];
  expiresAt: Date;
};

/**
 * Atomically reserves the requested raffle numbers.
 *
 * The UPDATE is the concurrency boundary: PostgreSQL locks the affected rows,
 * so two concurrent buyers cannot both transition the same number into a
 * reservation. Expired reservations are eligible for reuse.
 */
export async function reserveNumbers(
  db: Database,
  raffleId: string,
  numbers: number[],
  durationSeconds = 10 * 60,
): Promise<ReservationResult> {
  if (numbers.length === 0) {
    throw new Error("At least one number is required");
  }

  const uniqueNumbers = [...new Set(numbers)];
  if (uniqueNumbers.length !== numbers.length) {
    throw new Error("Duplicate numbers are not allowed");
  }

  if (durationSeconds <= 0) {
    throw new Error("Reservation duration must be positive");
  }

  const expiresAt = new Date(Date.now() + durationSeconds * 1000);

  const updated = await db
    .update(raffleNumbers)
    .set({
      status: "RESERVED",
      reservationExpiresAt: expiresAt,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(raffleNumbers.raffleId, raffleId),
        inArray(raffleNumbers.number, uniqueNumbers),
        or(
          eq(raffleNumbers.status, "AVAILABLE"),
          and(
            eq(raffleNumbers.status, "RESERVED"),
            sql`${raffleNumbers.reservationExpiresAt} <= now()`,
          ),
        ),
      ),
    )
    .returning({ id: raffleNumbers.id });

  if (updated.length !== uniqueNumbers.length) {
    throw new Error("NUMBER_UNAVAILABLE");
  }

  return {
    numberIds: updated.map((row) => row.id),
    expiresAt,
  };
}
