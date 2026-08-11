import { useEffect, useState } from "react";

type Raffle={id:string;title:string;slug:string;status:string;ticketPrice:string;numbersCount:number;createdAt:string};
export default function DashboardPage(){
 const [raffles,setRaffles]=useState<Raffle[]>([]); const [loading,setLoading]=useState(true);
 useEffect(()=>{fetch('/api/admin/raffles',{credentials:'include'}).then(r=>r.ok?r.json():{raffles:[]}).then(d=>setRaffles(d.raffles??[])).finally(()=>setLoading(false))},[]);
 const active=raffles.filter(r=>r.status==='ACTIVE').length;
 const sold=raffles.reduce((sum,r)=>sum+(r.status==='ACTIVE'?0:0),0);
 return <main className="admin-dashboard"><header><div><span className="section-label">RIFA X · ADMIN</span><h1>Dashboard</h1><p>Visão geral das suas rifas.</p></div><a href="/admin/raffles/new" className="primary-button">+ Nova rifa</a></header><section className="stats"><article><span>Rifas</span><strong>{raffles.length}</strong></article><article><span>Ativas</span><strong>{active}</strong></article><article><span>Pedidos</span><strong>{sold}</strong></article></section><section className="raffle-list"><div className="list-header"><h2>Suas rifas</h2><a href="/admin/raffles">Ver todas</a></div>{loading?<p>Carregando…</p>:raffles.length===0?<div className="empty"><strong>Nenhuma rifa criada</strong><p>Crie sua primeira rifa para começar.</p><a href="/admin/raffles/new">Criar rifa</a></div>:raffles.map(r=><a className="raffle-row" href={`/admin/raffles/${r.id}`} key={r.id}><div><strong>{r.title}</strong><small>/{r.slug} · {r.numbersCount} números</small></div><span className={`status status-${r.status.toLowerCase()}`}>{r.status}</span><b>›</b></a>)}</section></main>;
}
