import type { Context } from "hono";
import { createDatabase } from "@rifa-x/database";
import { users } from "@rifa-x/database/schema";
import { and, eq } from "drizzle-orm";

const COOKIE = "rifax_session";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function key(secret:string){return crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign","verify"])}
async function sign(value:string,secret:string){const s=await crypto.subtle.sign("HMAC",await key(secret),encoder.encode(value));return `${value}.${Array.from(new Uint8Array(s)).map(x=>x.toString(16).padStart(2,"0")).join("")}`}
async function verify(token:string,secret:string){const p=token.split(".");if(p.length!==2)return null;const ok=await crypto.subtle.verify("HMAC",await key(secret),new Uint8Array(p[1].match(/.{2}/g)!.map(x=>parseInt(x,16))),encoder.encode(p[0]));return ok?p[0]:null}
export async function createSession(c:Context, userId:string){const value=await sign(`${userId}.${Date.now()+8*60*60*1000}`,c.env.SESSION_SECRET);c.header("Set-Cookie",`${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800`);}
export async function clearSession(c:Context){c.header("Set-Cookie",`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`)}
export async function currentUser(c:Context){const raw=c.req.header("Cookie")?.match(new RegExp(`${COOKIE}=([^;]+)`))?.[1];if(!raw)return null;const value=await verify(raw,c.env.SESSION_SECRET);if(!value)return null;const [id,expires]=value.split(".");if(!id||Number(expires)<Date.now())return null;const db=createDatabase(c.env.DATABASE_URL);return db.query.users.findFirst({where:and(eq(users.id,id),eq(users.status,"ACTIVE"))});}
export function requireRole(...roles:string[]){return async (c:Context,next:()=>Promise<void>)=>{const user=await currentUser(c);if(!user)return c.json({error:"Unauthorized"},401);if(!roles.includes(user.role))return c.json({error:"Forbidden"},403);c.set("user",user);await next();}}
export async function login(c:Context,email:string,password:string){const db=createDatabase(c.env.DATABASE_URL);const user=await db.query.users.findFirst({where:and(eq(users.email,email),eq(users.status,"ACTIVE"))});if(!user||!user.passwordHash)return null;const digest=await crypto.subtle.digest("SHA-256",encoder.encode(password));const hash=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,"0")).join("");if(hash!==user.passwordHash)return null;await createSession(c,user.id);return {id:user.id,name:user.name,email:user.email,role:user.role,organizationId:user.organizationId};}
