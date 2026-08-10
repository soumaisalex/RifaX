import { Hono } from "hono";
import { cors } from "hono/cors";
import auth from "./routes/auth";
import adminRaffles from "./routes/admin-raffles";
import adminOrders from "./routes/admin-orders";
import publicRaffles from "./routes/public-raffles";
import publicOrders from "./routes/public-orders";
import { expireReservations } from "./services/reservation-expiry";

const app = new Hono<{ Bindings: { DATABASE_URL: string; SESSION_SECRET: string; APP_ENV?: string } }>();
app.use("/api/*", cors({ origin: (origin) => origin || "", allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"], allowHeaders: ["Content-Type", "Authorization"], maxAge: 86400 }));
app.use("/api/*", async (c, next) => { c.header("X-Content-Type-Options", "nosniff"); c.header("X-Frame-Options", "DENY"); c.header("Referrer-Policy", "strict-origin-when-cross-origin"); await next(); });
app.get("/api/health", (c) => c.json({ status: "ok", service: "rifa-x-api", env: c.env.APP_ENV ?? "development" }));
app.route("/api/auth", auth);
app.route("/api/admin/raffles", adminRaffles);
app.route("/api/admin/orders", adminOrders);
app.route("/api/public/raffles", publicRaffles);
app.route("/api/public", publicOrders);
app.notFound((c) => c.json({ error: "Not found" }, 404));
app.onError((err, c) => { console.error(err); return c.json({ error: c.env.APP_ENV === "production" ? "Internal server error" : err.message }, 500); });
export default app;

export const scheduled = async (_event: ScheduledEvent, env: { DATABASE_URL: string }) => {
  await expireReservations(env.DATABASE_URL);
};
