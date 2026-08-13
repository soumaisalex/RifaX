import { useEffect, useState } from "react";

type NumberRow={number:number;status:"AVAILABLE"|"RESERVED"|"SOLD";buyerName?:string;buyerPhone?:string};
type Order={id:string;buyerName:string;buyerPhone:string;total:string;status:string;createdAt:string};
const requestInit:RequestInit={credentials:"include"};

export default function AdminRaffleNumbersPage({raffleId}:{raffleId:string}){
 const [numbers,setNumbers]=useState<NumberRow[]>([]),[orders,setOrders]=useState<Order[]>([]),[filter,setFilter]=useState("ALL"),[search,setSearch]=useState("");
 useEffect(()=>{fetch(`/api/admin/raffles/${raffleId}/numbers?status=${filter}`,requestInit).then(r=>r.json()).then(d=>setNumbers(d.numbers??[]));},[raffleId,filter]);
 const loadOrders=()=>fetch(`/api/admin/orders?raffleId=${raffleId}&search=${encodeURIComponent(search)}`,requestInit).then(r=>r.json()).then(d=>setOrders(d.orders??[]));
 useEffect(()=>{loadOrders();},[raffleId]);
 return <main className="admin-numbers-page"><header className="admin-header"><div><span className="section-label">GESTÃO</span><h1>Números e pedidos</h1></div></header>
  <section className="number-panel"><div className="panel-header"><div><span className="section-label">NÚMEROS</span><h2>Mapa da rifa</h2></div><nav className="admin-filters">{[["ALL","Todos"],["AVAILABLE","Disponíveis"],["RESERVED","Reservados"],["SOLD","Vendidos"]].map(([v,l])=><button key={v} className={filter===v?"active":""} onClick={()=>setFilter(v)}>{l}</button>)}</nav></div><div className="number-grid">{numbers.map(n=><button key={n.number} className={`raffle-number ${n.status.toLowerCase()}`} title={n.status==="SOLD"?`${n.buyerName??""} · ${n.buyerPhone??""}`:n.status}>{String(n.number).padStart(3,"0")}</button>)}</div></section>
  <section className="admin-panel"><div className="panel-header"><div><span className="section-label">PEDIDOS</span><h2>Compradores</h2></div><div className="order-tools"><input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&loadOrders()} placeholder="Nome, telefone ou pedido"/><button onClick={loadOrders}>Buscar</button></div></div><div className="order-list">{orders.map(o=><article className="order-row" key={o.id}><div><strong>{o.buyerName}</strong><span>{o.buyerPhone}</span></div><span>R$ {Number(o.total).toFixed(2).replace(".",",")}</span><span className={`status status-${o.status.toLowerCase()}`}>{o.status}</span><button disabled={o.status!=="PENDING"} onClick={async()=>{await fetch(`/api/admin/orders/${o.id}/confirm-payment`,{method:"POST",...requestInit});loadOrders();}}>Confirmar Pix</button></article>)}</div></section>
 </main>;
}
