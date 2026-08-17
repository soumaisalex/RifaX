import { Hono } from "hono";
import { cors } from "hono/cors";
import { sql } from "drizzle-orm";
import { createDatabase } from "@rifa-x/database";
import auth from "./routes/auth";
import superAdmin from "./routes/super-admin";
import adminRaffles from "./routes/admin-raffles";
import adminOrders from "./routes/admin-orders";
import adminDraws from "./routes/admin-draws";
import publicRaffles from "./routes/public-raffles";
import publicOrders from "./routes/public-orders";
import publicResults from "./routes/public-results";
import { expireReservations } from "./services/reservation-expiry";
import type { AppBindings, AppVariables } from "./types";

const app = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();
app.use("/api/*", cors({ origin: (origin) => origin || "", allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"], allowHeaders: ["Content-Type", "Authorization"], maxAge: 86400 }));
app.use("/api/*", async (c, next) => { c.header("X-Content-Type-Options", "nosniff"); c.header("X-Frame-Options", "DENY"); c.header("Referrer-Policy", "strict-origin-when-cross-origin"); await next(); });
app.get("/api/health", (c) => c.json({ status: "ok", service: "rifa-x-api", env: c.env.APP_ENV ?? "development" }));
app.get("/api/health/db", async (c) => {
  const databaseUrl = c.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("Database health check: DATABASE_URL is missing from Worker environment");
    return c.json({ status: "error", database: "missing_configuration" }, 503);
  }

  try {
    const db = createDatabase(databaseUrl);
    await db.execute(sql`select 1 as ok`);
    return c.json({ status: "ok", database: "connected" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const safeMessage = message
      .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[redacted-database-url]")
      .replace(/password=[^\s&]+/gi, "password=[redacted]");
    console.error("Database health check connection failed", safeMessage);
    return c.json({ status: "error", database: "connection_failed" }, 503);
  }
});
app.route("/api/auth", auth);
app.route("/api/super-admin", superAdmin);
app.route("/api/admin/raffles", adminRaffles);
app.route("/api/admin/orders", adminOrders);
app.route("/api/admin/draws", adminDraws);
app.route("/api/public/raffles", publicRaffles);
app.route("/api/public", publicOrders);
app.route("/api/public", publicResults);
app.notFound((c) => c.json({ error: "Not found" }, 404));
app.onError((err, c) => { console.error(err); return c.json({ error: c.env.APP_ENV === "production" ? "Internal server error" : err.message }, 500); });
export default app;
export const scheduled = async (_event: ScheduledEvent, env: { DATABASE_URL: string }) => { await expireReservations(env.DATABASE_URL); };
