import { useEffect, useState } from "react";

type Order={id:string;status:string;buyer?:{name:string;phone:string};total:string;reservationExpiresAt?:string;payment?:{status:string;pixPayload?:string};numbers?:number[];raffle?:{title:string}};
const money=(v:string|number)=>`R$ ${Number(v).toFixed(2).replace(".",",")}`;
export default function OrderConfirmationPage({token}:{token:string}){
 const [order,setOrder]=useState<Order|null>(null),[copied,setCopied]=useState(false),[seconds,setSeconds]=useState(0);
 const load=async()=>{const r=await fetch(`/api/public/orders/${token}`);if(r.ok)setOrder(await r.json())};
 useEffect(()=>{load()},[token]);
 useEffect(()=>{if(!order||order.status!=="PENDING")return;const id=setInterval(load,5000);return()=>clearInterval(id)},[order?.status,token]);
 useEffect(()=>{if(!order?.reservationExpiresAt)return;const tick=()=>setSeconds(Math.max(0,Math.floor((new Date(order.reservationExpiresAt!).getTime()-Date.now())/1000)));tick();const id=setInterval(tick,1000);return()=>clearInterval(id)},[order?.reservationExpiresAt]);
 const copy=async()=>{if(!order?.payment?.pixPayload)return;await navigator.clipboard.writeText(order.payment.pixPayload);setCopied(true);setTimeout(()=>setCopied(false),1800)};
 if(!order)return <main className="order-page"><div className="skeleton"/></main>;
 const mm=String(Math.floor(seconds/60)).padStart(2,"0"),ss=String(seconds%60).padStart(2,"0");
 return <main className="order-page"><section className="order-card"><span className="section-label">RIFA X · PEDIDO</span><h1>{order.status==="PAID"?"Pagamento confirmado":order.status==="EXPIRED"?"Reserva expirada":"Seu pedido está reservado"}</h1><p>{order.raffle?.title}</p><div className="order-total"><span>Total</span><strong>{money(order.total)}</strong></div><div className="order-numbers">{order.numbers?.map(n=><span key={n}>{String(n).padStart(3,"0")}</span>)}</div>{order.status==="PENDING"&&<><div className="countdown"><span>Reserva válida por</span><strong>{mm}:{ss}</strong></div>{order.payment?.pixPayload&&<><div className="pix-qr" data-pix={order.payment.pixPayload} aria-label="QR Code Pix"></div><button className="pix-copy" onClick={copy}>{copied?"Código copiado ✓":"Copiar Pix Copia e Cola"}</button></>}<small>Após pagar, o administrador confirmará o Pix. A página verifica automaticamente o status.</small></>}{order.status==="PAID"&&<div className="success">Pagamento confirmado. Seus números estão garantidos.</div>}{order.status==="EXPIRED"&&<div className="expired">A reserva expirou. Escolha novos números para continuar.</div>}<button onClick={()=>navigator.share?.({title:order.raffle?.title,url:location.href})}>Compartilhar pedido</button></section></main>;
}
