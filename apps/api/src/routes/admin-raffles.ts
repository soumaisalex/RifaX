import { Hono } from "hono";
import { and, eq, isNull, sql } from "drizzle-orm";
import { createDatabase } from "@rifa-x/database";
import { raffles, raffleNumbers, rafflePrizes } from "@rifa-x/database/schema";
import { requireRole } from "../middleware/auth";
import type { AppBindings, AppVariables } from "../types";

type Auth = { userId: string; organizationId?: string | null; role: "SUPER_ADMIN" | "ORGANIZATION_ADMIN" | "COLLABORATOR" };
const adminRaffles = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();
const auth = (c: any) => c.get("auth") as Auth;
const canAccess = (organizationId: string, session: Auth) => session.role === "SUPER_ADMIN" || organizationId === session.organizationId;

adminRaffles.use("*", requireRole(["SUPER_ADMIN", "ORGANIZATION_ADMIN"]));

adminRaffles.get("/", async (c) => {
  const db = createDatabase(c.env.DATABASE_URL); const session = auth(c);
  const rows = await db.query.raffles.findMany({ where: isNull(raffles.deletedAt), columns: { id:true, organizationId:true, slug:true, title:true, description:true, status:true, ticketPrice:true, numbersCount:true, drawMethod:true, drawAt:true, pixKey:true, pixCity:true, bannerUrl:true, createdAt:true, updatedAt:true }, orderBy:(table,{desc})=>[desc(table.createdAt)] });
  return c.json({ raffles: session.role === "SUPER_ADMIN" ? rows : rows.filter((r:any)=>r.organizationId === session.organizationId) });
});

adminRaffles.get("/:id", async (c) => {
  const db = createDatabase(c.env.DATABASE_URL); const session = auth(c); const id = c.req.param("id");
  const raffle = await db.query.raffles.findFirst({ where: and(eq(raffles.id,id),isNull(raffles.deletedAt)) });
  if (!raffle || !canAccess(raffle.organizationId,session)) return c.json({error:"Not found"},404);
  const prizes = await db.query.rafflePrizes.findMany({ where: and(eq(rafflePrizes.raffleId,id),isNull(rafflePrizes.deletedAt)), orderBy:(table,{asc})=>[asc(table.position)] });
  const [counts] = await db.select({available:sql<number>`count(*) filter (where ${raffleNumbers.status} = 'AVAILABLE')`,reserved:sql<number>`count(*) filter (where ${raffleNumbers.status} = 'RESERVED')`,sold:sql<number>`count(*) filter (where ${raffleNumbers.status} = 'SOLD')`,total:sql<number>`count(*)`}).from(raffleNumbers).where(eq(raffleNumbers.raffleId,id));
  const revenue = Number(counts.sold) * Number(raffle.ticketPrice);
  return c.json({raffle:{...raffle,prizes},summary:{available:Number(counts.available),reserved:Number(counts.reserved),sold:Number(counts.sold),total:Number(counts.total),revenue:revenue.toFixed(2)}});
});

adminRaffles.post("/", async (c) => {
  const db = createDatabase(c.env.DATABASE_URL); const session = auth(c);
  const body = await c.req.json<{ organizationId?:string; title?:string; slug?:string; description?:string; ticketPrice?:string; numbersCount?:number; drawMethod?:"RIFA_X"|"FEDERAL_LOTTERY"; drawAt?:string; pixKey?:string; pixCity?:string; bannerUrl?:string; prizes?:{title:string;description?:string;imageUrl?:string}[] }>();
  const rawNumbersCount = body.numbersCount;
  if (!body.title?.trim() || !body.slug?.trim() || !body.ticketPrice || !Number.isInteger(rawNumbersCount) || rawNumbersCount < 1) return c.json({error:"Invalid raffle data"},400);
  const organizationId = session.role === "SUPER_ADMIN" ? body.organizationId : session.organizationId;
  if (!organizationId || !body.pixKey?.trim() || !body.pixCity?.trim()) return c.json({error:"Organization and Pix configuration are required"},400);
  const numbersCount = rawNumbersCount;
  const title = body.title.trim();
  const slug = body.slug.trim().toLowerCase();
  const ticketPrice = body.ticketPrice;
  const pixKey = body.pixKey.trim();
  const pixCity = body.pixCity.trim();
  try {
    const raffle = await db.transaction(async(tx)=>{ const [created]=await tx.insert(raffles).values({organizationId,title,slug,description:body.description?.trim()||null,ticketPrice,numbersCount,drawMethod:body.drawMethod??"RIFA_X",drawAt:body.drawAt?new Date(body.drawAt):null,pixKey,pixCity,bannerUrl:body.bannerUrl?.trim()||null,status:"DRAFT"}).returning(); await tx.insert(raffleNumbers).values(Array.from({length:numbersCount},(_,i)=>({raffleId:created.id,number:i+1,status:"AVAILABLE" as const}))); if(body.prizes?.length) await tx.insert(rafflePrizes).values(body.prizes.map((p,i)=>({raffleId:created.id,position:i+1,title:p.title.trim(),description:p.description?.trim()||null,imageUrl:p.imageUrl?.trim()||null}))); return created; });
    return c.json({raffle},201);
  }catch{return c.json({error:"Unable to create raffle"},409);}
});

adminRaffles.patch("/:id",async(c)=>{const db=createDatabase(c.env.DATABASE_URL);const session=auth(c);const id=c.req.param("id");const existing=await db.query.raffles.findFirst({where:and(eq(raffles.id,id),isNull(raffles.deletedAt))});if(!existing||!canAccess(existing.organizationId,session)||existing.status==="COMPLETED")return c.json({error:"Not found or not editable"},404);const body=await c.req.json<Record<string,unknown>>();const allowed=["title","slug","description","ticketPrice","drawMethod","drawAt","pixKey","pixCity","bannerUrl"] as const;const patch:Record<string,unknown>={};for(const key of allowed)if(body[key]!==undefined)patch[key]=body[key];const[raffle]=await db.update(raffles).set({...patch,updatedAt:new Date()}).where(eq(raffles.id,id)).returning();return c.json({raffle});});
adminRaffles.delete("/:id",async(c)=>{const db=createDatabase(c.env.DATABASE_URL);const session=auth(c);const id=c.req.param("id");const existing=await db.query.raffles.findFirst({where:and(eq(raffles.id,id),isNull(raffles.deletedAt))});if(!existing||!canAccess(existing.organizationId,session))return c.json({error:"Not found"},404);await db.update(raffles).set({deletedAt:new Date(),updatedAt:new Date(),status:"CANCELLED"}).where(eq(raffles.id,id));return c.body(null,204);});
adminRaffles.post("/:id/publish",async(c)=>{const db=createDatabase(c.env.DATABASE_URL);const session=auth(c);const id=c.req.param("id");const existing=await db.query.raffles.findFirst({where:and(eq(raffles.id,id),isNull(raffles.deletedAt))});if(!existing||!canAccess(existing.organizationId,session))return c.json({error:"Not found"},404);const[raffle]=await db.update(raffles).set({status:"ACTIVE",updatedAt:new Date()}).where(eq(raffles.id,id)).returning();return c.json({raffle});});
adminRaffles.post("/:id/unpublish",async(c)=>{const db=createDatabase(c.env.DATABASE_URL);const session=auth(c);const id=c.req.param("id");const existing=await db.query.raffles.findFirst({where:and(eq(raffles.id,id),isNull(raffles.deletedAt))});if(!existing||!canAccess(existing.organizationId,session)||existing.status!=="ACTIVE")return c.json({error:"Not found or not active"},404);const[raffle]=await db.update(raffles).set({status:"DRAFT",updatedAt:new Date()}).where(eq(raffles.id,id)).returning();return c.json({raffle});});
adminRaffles.post("/:id/cancel",async(c)=>{const db=createDatabase(c.env.DATABASE_URL);const session=auth(c);const id=c.req.param("id");const existing=await db.query.raffles.findFirst({where:and(eq(raffles.id,id),isNull(raffles.deletedAt))});if(!existing||!canAccess(existing.organizationId,session)||existing.status==="COMPLETED")return c.json({error:"Not found or already completed"},404);const[raffle]=await db.update(raffles).set({status:"CANCELLED",updatedAt:new Date(),deletedAt:new Date()}).where(eq(raffles.id,id)).returning();return c.json({raffle});});
export default adminRaffles;
