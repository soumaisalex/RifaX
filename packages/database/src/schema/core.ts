import { pgTable, uuid, varchar, timestamp, boolean, integer, numeric, text, jsonb, uniqueIndex, index, pgEnum } from "drizzle-orm/pg-core";

export const organizationStatus = pgEnum("organization_status", ["ACTIVE", "INACTIVE"]);
export const userRole = pgEnum("user_role", ["SUPER_ADMIN", "ORGANIZATION_ADMIN", "COLLABORATOR"]);
export const userStatus = pgEnum("user_status", ["ACTIVE", "INACTIVE"]);
export const raffleStatus = pgEnum("raffle_status", ["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"]);
export const numberStatus = pgEnum("number_status", ["AVAILABLE", "RESERVED", "SOLD"]);
export const orderStatus = pgEnum("order_status", ["PENDING", "PAID", "EXPIRED", "CANCELLED"]);
export const paymentStatus = pgEnum("payment_status", ["PENDING", "CONFIRMED", "CANCELLED"]);
export const drawMethod = pgEnum("draw_method", ["FEDERAL_LOTTERY", "RIFA_X"]);
export const drawStatus = pgEnum("draw_status", ["PENDING", "COMPLETED", "CANCELLED"]);

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 120 }).notNull(),
  logoUrl: text("logo_url"),
  status: organizationStatus("status").default("ACTIVE").notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => ({ slugIdx: uniqueIndex("organizations_slug_unique").on(table.slug) }));

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  name: varchar("name", { length: 160 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  passwordHash: text("password_hash"),
  role: userRole("role").notNull(),
  status: userStatus("status").default("ACTIVE").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => ({ emailIdx: uniqueIndex("users_email_unique").on(table.email), orgIdx: index("users_organization_idx").on(table.organizationId) }));

export const raffles = pgTable("raffles", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  slug: varchar("slug", { length: 120 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  bannerUrl: text("banner_url"),
  regulation: text("regulation"),
  numbersCount: integer("numbers_count").notNull(),
  ticketPrice: numeric("ticket_price", { precision: 12, scale: 2 }).notNull(),
  drawMethod: drawMethod("draw_method").default("RIFA_X").notNull(),
  drawAt: timestamp("draw_at", { withTimezone: true }),
  pixKey: varchar("pix_key", { length: 255 }),
  pixCity: varchar("pix_city", { length: 80 }),
  status: raffleStatus("status").default("DRAFT").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => ({ slugIdx: uniqueIndex("raffles_slug_unique").on(table.slug), orgIdx: index("raffles_organization_idx").on(table.organizationId) }));

export const rafflePrizes = pgTable("raffle_prizes", {
  id: uuid("id").defaultRandom().primaryKey(),
  raffleId: uuid("raffle_id").notNull().references(() => raffles.id),
  position: integer("position").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  estimatedValue: numeric("estimated_value", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => ({ rafflePositionIdx: uniqueIndex("raffle_prizes_position_unique").on(table.raffleId, table.position) }));

export const raffleNumbers = pgTable("raffle_numbers", {
  id: uuid("id").defaultRandom().primaryKey(),
  raffleId: uuid("raffle_id").notNull().references(() => raffles.id),
  number: integer("number").notNull(),
  status: numberStatus("status").default("AVAILABLE").notNull(),
  reservationExpiresAt: timestamp("reservation_expires_at", { withTimezone: true }),
  soldAt: timestamp("sold_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({ raffleNumberIdx: uniqueIndex("raffle_numbers_unique").on(table.raffleId, table.number), statusIdx: index("raffle_numbers_status_idx").on(table.raffleId, table.status) }));

export const buyers = pgTable("buyers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({ phoneIdx: index("buyers_phone_idx").on(table.phone) }));

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  raffleId: uuid("raffle_id").notNull().references(() => raffles.id),
  buyerId: uuid("buyer_id").notNull().references(() => buyers.id),
  publicTokenHash: varchar("public_token_hash", { length: 128 }).notNull(),
  status: orderStatus("status").default("PENDING").notNull(),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  reservationExpiresAt: timestamp("reservation_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({ tokenIdx: uniqueIndex("orders_public_token_hash_unique").on(table.publicTokenHash), raffleIdx: index("orders_raffle_idx").on(table.raffleId, table.createdAt) }));

export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  raffleNumberId: uuid("raffle_number_id").notNull().references(() => raffleNumbers.id),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({ orderNumberIdx: uniqueIndex("order_items_order_number_unique").on(table.orderId, table.raffleNumberId) }));

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  method: varchar("method", { length: 30 }).default("PIX").notNull(),
  status: paymentStatus("status").default("PENDING").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  pixPayload: text("pix_payload"),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  confirmedBy: uuid("confirmed_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({ orderIdx: index("payments_order_status_idx").on(table.orderId, table.status) }));

export const draws = pgTable("draws", {
  id: uuid("id").defaultRandom().primaryKey(),
  raffleId: uuid("raffle_id").notNull().references(() => raffles.id),
  method: drawMethod("method").notNull(),
  status: drawStatus("status").default("PENDING").notNull(),
  contestNumber: varchar("contest_number", { length: 40 }),
  externalResultReference: text("external_result_reference"),
  randomCommitment: varchar("random_commitment", { length: 128 }),
  executedAt: timestamp("executed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({ raffleIdx: uniqueIndex("draws_raffle_unique").on(table.raffleId) }));

export const drawWinners = pgTable("draw_winners", {
  id: uuid("id").defaultRandom().primaryKey(),
  drawId: uuid("draw_id").notNull().references(() => draws.id),
  rafflePrizeId: uuid("raffle_prize_id").notNull().references(() => rafflePrizes.id),
  raffleNumberId: uuid("raffle_number_id").notNull().references(() => raffleNumbers.id),
  buyerId: uuid("buyer_id").notNull().references(() => buyers.id),
  position: integer("position").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({ drawPositionIdx: uniqueIndex("draw_winners_position_unique").on(table.drawId, table.position) }));

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  actorUserId: uuid("actor_user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 80 }).notNull(),
  entityId: uuid("entity_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({ orgDateIdx: index("audit_logs_organization_date_idx").on(table.organizationId, table.createdAt) }));
