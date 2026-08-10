import { useEffect, useMemo, useState } from "react";

type Raffle = { id:string; slug:string; title:string; status:string; ticketPrice:string; numbersCount:number; drawAt?:string|null };
type Order = { id:string; raffleId:string; raffleTitle:string; buyerName:string; buyerPhone:string; total:string; status:string; createdAt:string };

const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("rifax_session") ?? ""}` });

export default function AdminDashboardPage() {
  const [raffles,setRaffles]=useState<Raffle[]>([]); const [orders,setOrders]=useState<Order[]>([]); const [status,setStatus]=useState("ALL"); const [search,setSearch]=useState("");
  const load=async()=>{ const [r,o]=await Promise.all([fetch("/api/admin/raffles",{headers:auth()}),fetch(`/api/admin/orders?status=${status}&search=${encodeURIComponent(search)}`,{headers:auth()})]); setRaffles((await r.json()).raffles??[]); setOrders((await o.json()).orders??[]); };
  useEffect(()=>{load();},[status]);
  const stats=useMemo(()=>({active:raffles.filter(r=>r.status==="ACTIVE").length,sold:orders.filter(o=>o.status==="PAID").length,pending:orders.filter(o=>o.status==="PENDING").length,revenue:orders.filter(o=>o.status==="PAID").reduce((s,o)=>s+Number(o.total),0)}),[raffles,orders]);
  return <main className="admin-dashboard">
    <header className="admin-header"><div><span className="section-label">RIFA X</span><h1>Dashboard</h1></div><button>+ Nova rifa</button></header>
    <section className="stats-grid"><article><span>Rifas ativas</span><strong>{stats.active}</strong></article><article><span>Pedidos pagos</span><strong>{stats.sold}</strong></article><article><span>Aguardando Pix</span><strong>{stats.pending}</strong></article><article><span>Faturamento</span><strong>R$ {stats.revenue.toFixed(2).replace(".",",")}</strong></article></section>
    <section className="admin-panel"><div className="panel-header"><div><span className="section-label">PEDIDOS</span><h2>Pagamentos</h2></div><div className="order-tools"><input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&load()} placeholder="Buscar nome, telefone ou pedido"/><button onClick={load}>Buscar</button></div></div>
      <nav className="admin-filters">{["ALL","PENDING","PAID","CANCELLED"].map(s=><button key={s} className={status===s?"active":""} onClick={()=>setStatus(s)}>{s==="ALL"?"Todos":s==="PENDING"?"Pendentes":s==="PAID"?"Pagos":"Cancelados"}</button>)}</nav>
      <div className="order-list">{orders.map(o=><article className="order-row" key={o.id}><div><strong>{o.buyerName}</strong><span>{o.buyerPhone} · {o.raffleTitle}</span></div><strong>R$ {Number(o.total).toFixed(2).replace(".",",")}</strong><span className={`status status-${o.status.toLowerCase()}`}>{o.status}</span><button onClick={async()=>{if(o.status!=="PENDING")return;await fetch(`/api/admin/orders/${o.id}/confirm-payment`,{method:"POST",headers:auth()});load();}}>Confirmar Pix</button></article>)}</div>
    </section>
  </main>;
}
