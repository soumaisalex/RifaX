import { useEffect, useMemo, useState } from "react";

type Raffle = { id:string; slug:string; title:string; status:string; ticketPrice:string; numbersCount:number; drawAt?:string|null };
type Order = { id:string; raffleId:string; raffleTitle:string; buyerName:string; buyerPhone:string; total:string; status:string; createdAt:string };
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("rifax_session") ?? ""}` });

export default function AdminDashboardPage() {
  const [raffles,setRaffles]=useState<Raffle[]>([]); const [orders,setOrders]=useState<Order[]>([]); const [status,setStatus]=useState("ALL"); const [search,setSearch]=useState(""); const [error,setError]=useState("");
  const load=async()=>{ setError(""); const [r,o]=await Promise.all([fetch("/api/admin/raffles",{headers:auth()}),fetch(`/api/admin/orders?status=${status}&search=${encodeURIComponent(search)}`,{headers:auth()})]); if(r.status===401||o.status===401){window.location.replace("/admin/login");return;} if(!r.ok||!o.ok){setError("Não foi possível carregar os dados do painel.");return;} setRaffles((await r.json()).raffles??[]); setOrders((await o.json()).orders??[]); };
  useEffect(()=>{load();},[status]);
  const stats=useMemo(()=>({active:raffles.filter(r=>r.status==="ACTIVE").length,sold:orders.filter(o=>o.status==="PAID").length,pending:orders.filter(o=>o.status==="PENDING").length,revenue:orders.filter(o=>o.status==="PAID").reduce((s,o)=>s+Number(o.total),0)}),[raffles,orders]);
  const logout=async()=>{await fetch("/api/auth/logout",{method:"POST",headers:auth()});localStorage.removeItem("rifax_session");window.location.replace("/");};
  return <main className="admin-dashboard">
    <header className="admin-header"><div><span className="section-label">RIFA X</span><h1>Dashboard</h1><p>Gestão de rifas, números e pagamentos.</p></div><div className="header-actions"><a className="button primary" href="/admin/raffles/new">+ Nova rifa</a><button className="button secondary" onClick={logout}>Sair</button></div></header>
    <section className="stats-grid"><article><span>Rifas ativas</span><strong>{stats.active}</strong></article><article><span>Pedidos pagos</span><strong>{stats.sold}</strong></article><article><span>Aguardando Pix</span><strong>{stats.pending}</strong></article><article><span>Faturamento</span><strong>R$ {stats.revenue.toFixed(2).replace(".",",")}</strong></article></section>
    <section className="admin-panel"><div className="panel-header"><div><span className="section-label">RIFAS</span><h2>Minhas rifas</h2></div><a className="button secondary" href="/admin/raffles/new">Criar rifa</a></div>
      <div className="raffle-list">{raffles.length===0?<div className="empty-state"><strong>Você ainda não criou uma rifa.</strong><span>Comece agora e publique sua primeira rifa.</span><a className="button primary" href="/admin/raffles/new">Criar primeira rifa</a></div>:raffles.map(r=><article className="raffle-row" key={r.id}><div><strong>{r.title}</strong><span>/{r.slug} · {r.numbersCount} números · R$ {Number(r.ticketPrice).toFixed(2).replace(".",",")}</span></div><span className={`status status-${r.status.toLowerCase()}`}>{r.status}</span><div className="header-actions"><a className="button secondary" href={`/r/${r.slug}`}>Abrir</a>{r.status==="ACTIVE"&&<a className="button primary" href={`/admin/raffles/${r.id}/draw`}>Sortear</a>}</div></article>)}</div>
    </section>
    <section className="admin-panel"><div className="panel-header"><div><span className="section-label">PEDIDOS</span><h2>Pagamentos</h2></div><div className="order-tools"><input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&load()} placeholder="Buscar nome, telefone ou pedido"/><button onClick={load}>Buscar</button></div></div>
      <nav className="admin-filters">{["ALL","PENDING","PAID","CANCELLED"].map(s=><button key={s} className={status===s?"active":""} onClick={()=>setStatus(s)}>{s==="ALL"?"Todos":s==="PENDING"?"Pendentes":s==="PAID"?"Pagos":"Cancelados"}</button>)}</nav>
      {error&&<div className="form-error">{error}</div>}
      <div className="order-list">{orders.length===0?<div className="empty-state"><strong>Nenhum pedido encontrado.</strong><span>Quando seus participantes fizerem pedidos, eles aparecerão aqui.</span></div>:orders.map(o=><article className="order-row" key={o.id}><div><strong>{o.buyerName}</strong><span>{o.buyerPhone} · {o.raffleTitle}</span></div><strong>R$ {Number(o.total).toFixed(2).replace(".",",")}</strong><span className={`status status-${o.status.toLowerCase()}`}>{o.status}</span><button onClick={async()=>{if(o.status!=="PENDING")return;await fetch(`/api/admin/orders/${o.id}/confirm-payment`,{method:"POST",headers:auth()});load();}}>Confirmar Pix</button></article>)}</div>
    </section>
  </main>;
}
