import { Hono } from "hono";
import { and, eq, isNull } from "drizzle-orm";
import { createDatabase } from "@rifa-x/database";
import { organizations, users } from "@rifa-x/database/schema";
import { requireRole } from "../middleware/auth";

const app = new Hono();
const guard = requireRole(["SUPER_ADMIN"]);
app.use("/*", guard);

app.get("/organizations", async (c) => {
  const db = createDatabase(c.env.DATABASE_URL);
  const rows = await db.select().from(organizations).where(isNull(organizations.deletedAt));
  return c.json({ organizations: rows });
});

app.post("/organizations", async (c) => {
  const body = await c.req.json<{name?:string;slug?:string}>();
  if (!body.name?.trim() || !body.slug?.trim()) return c.json({error:"Name and slug are required"},400);
  const db = createDatabase(c.env.DATABASE_URL);
  try { const [organization] = await db.insert(organizations).values({name:body.name.trim(),slug:body.slug.trim().toLowerCase(),status:"ACTIVE"}).returning(); return c.json({organization},201); }
  catch { return c.json({error:"Organization slug already exists"},409); }
});

app.patch("/organizations/:id", async (c) => {
  const id=c.req.param("id"); const body=await c.req.json<{name?:string;status?:"ACTIVE"|"INACTIVE"}>();
  const db=createDatabase(c.env.DATABASE_URL);
  const [organization]=await db.update(organizations).set({...(body.name!==undefined?{name:body.name.trim()}:{}),...(body.status?{status:body.status}:{}),updatedAt:new Date()}).where(and(eq(organizations.id,id),isNull(organizations.deletedAt))).returning();
  if(!organization)return c.json({error:"Organization not found"},404); return c.json({organization});
});

app.delete("/organizations/:id", async (c) => {
  const id=c.req.param("id"); const db=createDatabase(c.env.DATABASE_URL);
  const [organization]=await db.update(organizations).set({deletedAt:new Date(),status:"INACTIVE",updatedAt:new Date()}).where(and(eq(organizations.id,id),isNull(organizations.deletedAt))).returning({id:organizations.id});
  if(!organization)return c.json({error:"Organization not found"},404);
  await db.update(users).set({status:"INACTIVE",updatedAt:new Date()}).where(eq(users.organizationId,id));
  return c.json({ok:true});
});

export default app;
