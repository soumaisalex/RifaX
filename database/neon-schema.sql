-- Rifa X / Neon PostgreSQL schema
-- Generated from packages/database/src/schema/core.ts
-- Run this file against an empty Neon database.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN CREATE TYPE organization_status AS ENUM ('ACTIVE','INACTIVE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('SUPER_ADMIN','ORGANIZATION_ADMIN','COLLABORATOR'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE user_status AS ENUM ('ACTIVE','INACTIVE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE raffle_status AS ENUM ('DRAFT','ACTIVE','COMPLETED','CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE number_status AS ENUM ('AVAILABLE','RESERVED','SOLD'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE order_status AS ENUM ('PENDING','PAID','EXPIRED','CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_status AS ENUM ('PENDING','CONFIRMED','CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE draw_method AS ENUM ('FEDERAL_LOTTERY','RIFA_X'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE draw_status AS ENUM ('PENDING','COMPLETED','CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS organizations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(160) NOT NULL, slug varchar(120) NOT NULL,
 logo_url text, status organization_status NOT NULL DEFAULT 'ACTIVE', verified_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS organizations_slug_unique ON organizations(slug);

CREATE TABLE IF NOT EXISTS users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid REFERENCES organizations(id), name varchar(160) NOT NULL,
 email varchar(320) NOT NULL, password_hash text, role user_role NOT NULL, status user_status NOT NULL DEFAULT 'ACTIVE',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email);
CREATE INDEX IF NOT EXISTS users_organization_idx ON users(organization_id);

CREATE TABLE IF NOT EXISTS raffles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id), slug varchar(120) NOT NULL,
 title varchar(200) NOT NULL, description text, banner_url text, regulation text, numbers_count integer NOT NULL,
 ticket_price numeric(12,2) NOT NULL, draw_method draw_method NOT NULL DEFAULT 'RIFA_X', draw_at timestamptz,
 pix_key varchar(255), pix_city varchar(80), status raffle_status NOT NULL DEFAULT 'DRAFT',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS raffles_slug_unique ON raffles(slug);
CREATE INDEX IF NOT EXISTS raffles_organization_idx ON raffles(organization_id);

CREATE TABLE IF NOT EXISTS raffle_prizes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), raffle_id uuid NOT NULL REFERENCES raffles(id), position integer NOT NULL,
 title varchar(200) NOT NULL, description text, image_url text, estimated_value numeric(12,2),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS raffle_prizes_position_unique ON raffle_prizes(raffle_id,position);

CREATE TABLE IF NOT EXISTS raffle_numbers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), raffle_id uuid NOT NULL REFERENCES raffles(id), number integer NOT NULL,
 status number_status NOT NULL DEFAULT 'AVAILABLE', reservation_expires_at timestamptz, sold_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS raffle_numbers_unique ON raffle_numbers(raffle_id,number);
CREATE INDEX IF NOT EXISTS raffle_numbers_status_idx ON raffle_numbers(raffle_id,status);

CREATE TABLE IF NOT EXISTS buyers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(160) NOT NULL, phone varchar(20) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS buyers_phone_idx ON buyers(phone);

CREATE TABLE IF NOT EXISTS orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), raffle_id uuid NOT NULL REFERENCES raffles(id), buyer_id uuid NOT NULL REFERENCES buyers(id),
 public_token_hash varchar(128) NOT NULL, status order_status NOT NULL DEFAULT 'PENDING', subtotal numeric(12,2) NOT NULL,
 total numeric(12,2) NOT NULL, reservation_expires_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS orders_public_token_hash_unique ON orders(public_token_hash);
CREATE INDEX IF NOT EXISTS orders_raffle_idx ON orders(raffle_id,created_at);

CREATE TABLE IF NOT EXISTS order_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES orders(id), raffle_number_id uuid NOT NULL REFERENCES raffle_numbers(id),
 unit_price numeric(12,2) NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS order_items_order_number_unique ON order_items(order_id,raffle_number_id);

CREATE TABLE IF NOT EXISTS payments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES orders(id), method varchar(30) NOT NULL DEFAULT 'PIX',
 status payment_status NOT NULL DEFAULT 'PENDING', amount numeric(12,2) NOT NULL, pix_payload text,
 confirmed_at timestamptz, confirmed_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payments_order_status_idx ON payments(order_id,status);

CREATE TABLE IF NOT EXISTS draws (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), raffle_id uuid NOT NULL REFERENCES raffles(id), method draw_method NOT NULL,
 status draw_status NOT NULL DEFAULT 'PENDING', contest_number varchar(40), external_result_reference text,
 random_commitment varchar(128), executed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS draws_raffle_unique ON draws(raffle_id);

CREATE TABLE IF NOT EXISTS draw_winners (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), draw_id uuid NOT NULL REFERENCES draws(id), raffle_prize_id uuid NOT NULL REFERENCES raffle_prizes(id),
 raffle_number_id uuid NOT NULL REFERENCES raffle_numbers(id), buyer_id uuid NOT NULL REFERENCES buyers(id), position integer NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS draw_winners_position_unique ON draw_winners(draw_id,position);

CREATE TABLE IF NOT EXISTS audit_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid REFERENCES organizations(id), actor_user_id uuid REFERENCES users(id),
 action varchar(100) NOT NULL, entity_type varchar(80) NOT NULL, entity_id uuid, metadata jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_organization_date_idx ON audit_logs(organization_id,created_at);

COMMIT;
