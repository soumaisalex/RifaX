import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema/index.js";

const connectionString = process.env.DATABASE_URL;

export function createDatabase(databaseUrl = connectionString) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  const client = postgres(databaseUrl, { prepare: false });
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDatabase>;
