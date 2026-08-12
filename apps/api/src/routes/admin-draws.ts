import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { createDatabase } from "@rifa-x/database";
import { draws, drawWinners, raffleNumbers, rafflePrizes, raffles, orderItems, orders, buyers, auditLogs } from "@rifa-x/database/schema";
import { requireRole } from "../middleware/auth";
import type { AppBindings, AppVariables } from "../types";

const app = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();
app.post("/:raffleId/draw", requireRole(["SUPER_ADMIN","ORGANIZATION_ADMIN"]), async c => {
  const raffleId = c.req.param("raffleId");
  if (!raffleId) return c.json({ error: "Raffle id is required" }, 400);
  const auth = c.get("auth");
  const db = createDatabase(c.env.DATABASE_URL);
  try {
    const result = await db.transaction(async tx => {
      const raffle = await tx.query.raffles.findFirst({where:and(eq(raffles.id,raffleId),eq(raffles.status,"ACTIVE"))});
      if (!raffle) return null;
      if (auth.role !== "SUPER_ADMIN" && raffle.organizationId !== auth.organizationId) throw new Error("FORBIDDEN");
      const existing = await tx.query.draws.findFirst({where:eq(draws.raffleId,raffleId)});
      if (existing) throw new Error("DRAW_ALREADY_EXECUTED");
      const prizes = await tx.select().from(rafflePrizes).where(and(eq(rafflePrizes.raffleId,raffleId),eq(rafflePrizes.deletedAt,null as any)));
      const sold = await tx.select({numberId:raffleNumbers.id,number:raffleNumbers.number,buyerId:buyers.id}).from(raffleNumbers).innerJoin(orderItems,eq(orderItems.raffleNumberId,raffleNumbers.id)).innerJoin(orders,eq(orders.id,orderItems.orderId)).innerJoin(buyers,eq(buyers.id,orders.buyerId)).where(and(eq(raffleNumbers.raffleId,raffleId),eq(raffleNumbers.status,"SOLD"),eq(orders.status,"PAID")));
      const uniqueSold = Array.from(new Map(sold.map(x=>[x.numberId,x])).values());
      if (!uniqueSold.length) throw new Error("NO_SOLD_NUMBERS");
      if (prizes.length > uniqueSold.length) throw new Error("NOT_ENOUGH_SOLD_NUMBERS");
      for (let i=uniqueSold.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[uniqueSold[i],uniqueSold[j]]=[uniqueSold[j],uniqueSold[i]];}
      const [draw] = await tx.insert(draws).values({raffleId,method:raffle.drawMethod,status:"COMPLETED",executedAt:new Date()}).returning();
      const winners = prizes.sort((a,b)=>a.position-b.position).map((prize,i)=>({drawId:draw.id,rafflePrizeId:prize.id,raffleNumberId:uniqueSold[i].numberId,buyerId:uniqueSold[i].buyerId,position:i+1}));
      await tx.insert(drawWinners).values(winners);
      await tx.update(raffles).set({status:"COMPLETED",updatedAt:new Date()}).where(eq(raffles.id,raffleId));
      await tx.insert(auditLogs).values({organizationId:raffle.organizationId,actorUserId:auth.userId,action:"RAFFLE_DRAW_EXECUTED",entityType:"DRAW",entityId:draw.id,metadata:{raffleId,winnerCount:winners.length}});
      return {draw,winners:numbersForResponse(winners,uniqueSold)};
    });
    if(!result)return c.json({error:"Raffle not found or inactive"},404);
    return c.json(result,201);
  } catch(e) {
    const message=e instanceof Error?e.message:"DRAW_FAILED";
    if(message==="FORBIDDEN")return c.json({error:"Forbidden"},403);
    if(message==="DRAW_ALREADY_EXECUTED")return c.json({error:"Draw already executed"},409);
    if(message==="NO_SOLD_NUMBERS")return c.json({error:"There are no sold numbers"},409);
    if(message==="NOT_ENOUGH_SOLD_NUMBERS")return c.json({error:"There are not enough sold numbers for all prizes"},409);
    return c.json({error:"Unable to execute draw"},500);
  }
});
function numbersForResponse(winners:Array<{raffleNumberId:string;buyerId:string;position:number}>,sold:Array<{numberId:string;number:number;buyerId:string}>){return winners.map(w=>{const n=sold.find(x=>x.numberId===w.raffleNumberId)!;return {...w,number:n.number}})}
app.get("/:raffleId/draw", async c=>{const raffleId=c.req.param("raffleId"); if(!raffleId)return c.json({draw:null}); const db=createDatabase(c.env.DATABASE_URL);const draw=await db.query.draws.findFirst({where:eq(draws.raffleId,raffleId)});if(!draw)return c.json({draw:null});const winners=await db.select({position:drawWinners.position,number:raffleNumbers.number,buyerName:buyers.name,prizeTitle:rafflePrizes.title}).from(drawWinners).innerJoin(raffleNumbers,eq(raffleNumbers.id,drawWinners.raffleNumberId)).innerJoin(buyers,eq(buyers.id,drawWinners.buyerId)).innerJoin(rafflePrizes,eq(rafflePrizes.id,drawWinners.rafflePrizeId)).where(eq(drawWinners.drawId,draw.id));return c.json({draw,winners});});
export default app;
