import { useEffect, useMemo, useState } from "react";

type NumberItem={number:number;status:"AVAILABLE"|"RESERVED"|"SOLD"};
type Raffle={id:string;title:string;description?:string|null;bannerUrl?:string|null;ticketPrice:string;numbersCount:number;soldCount:number;participantCount:number;prizes:{title:string;description?:string|null;imageUrl?:string|null}[]};
const money=(v:string|number)=>`R$ ${Number(v).toFixed(2).replace(".",",")}`;
export default function PublicRafflePage({slug}:{slug:string}){
 const [raffle,setRaffle]=useState<Raffle|null>(null),[numbers,setNumbers]=useState<NumberItem[]>([]),[selected,setSelected]=useState<number[]>([]),[page,setPage]=useState(1),[loading,setLoading]=useState(true),[name,setName]=useState(""),[phone,setPhone]=useState(""),[sharing,setSharing]=useState(false);
 const perPage=100;
 useEffect(()=>{Promise.all([fetch(`/api/public/raffles/${slug}`).then(r=>r.json()),fetch(`/api/public/raffles/${slug}/numbers`).then(r=>r.json())]).then(([r,n])=>{setRaffle(r);setNumbers(n.numbers??[])}).finally(()=>setLoading(false));},[slug]);
 const pageNumbers=useMemo(()=>numbers.slice((page-1)*perPage,page*perPage),[numbers,page]);
 const progress=raffle?Math.round((raffle.soldCount/raffle.numbersCount)*100):0;
 const toggle=(n:NumberItem)=>{if(n.status!=="AVAILABLE")return;setSelected(s=>s.includes(n.number)?s.filter(x=>x!==n.number):[...s,n.number]);};
 const total=selected.length*Number(raffle?.ticketPrice??0);
 const maskPhone=(v:string)=>{const d=v.replace(/\D/g,"").slice(0,11);if(d.length<=2)return d?`(${d}`:d;if(d.length<=7)return `(${d.slice(0,2)}) ${d.slice(2)}`;return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`};
 const checkout=async()=>{const r=await fetch(`/api/public/raffles/${raffle?.id}/orders`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,phone,numbers:selected})});if(!r.ok)return;const data=await r.json();sessionStorage.setItem("rifax_order",JSON.stringify(data));window.location.href=`/pedido/${data.publicToken}`;};
 const share=async()=>{setSharing(true);try{if(navigator.share)await navigator.share({title:raffle?.title,url:location.href});else await navigator.clipboard.writeText(location.href);}finally{setSharing(false)}};
 if(loading)return <main className="public-page"><div className="skeleton"/></main>; if(!raffle)return <main className="public-page"><h1>Rifa não encontrada</h1></main>;
 return <main className="public-page">
  <header className="raffle-hero">{raffle.bannerUrl&&<img src={raffle.bannerUrl} alt=""/>}<div><span className="section-label">RIFA X</span><h1>{raffle.title}</h1>{raffle.description&&<p>{raffle.description}</p>}<button onClick={share}>{sharing?"Compartilhando…":"Compartilhar"}</button></div></header>
  <section className="raffle-progress"><div className="progress-meta"><strong>{progress}% vendido</strong><span>{raffle.soldCount} de {raffle.numbersCount}</span></div><div className="progress-track"><i style={{width:`${progress}%`}}/></div><p>{raffle.participantCount} participantes</p></section>
  <section className="prize-list">{raffle.prizes.map((p,i)=><article key={i}>{p.imageUrl&&<img src={p.imageUrl} alt=""/>}<div><span className="section-label">PRÊMIO {i+1}</span><h2>{p.title}</h2><p>{p.description}</p></div></article>)}</section>
  <section className="number-section"><div className="section-heading"><div><span className="section-label">ESCOLHA SEUS NÚMEROS</span><h2>Selecione as cotas</h2></div><strong>{selected.length} selecionadas</strong></div><div className="number-grid">{pageNumbers.map(n=><button key={n.number} disabled={n.status!=="AVAILABLE"} aria-pressed={selected.includes(n.number)} className={`raffle-number ${n.status.toLowerCase()} ${selected.includes(n.number)?"selected":""}`} onClick={()=>toggle(n)}>{String(n.number).padStart(3,"0")}</button>)}</div><div className="pagination"><button disabled={page===1} onClick={()=>setPage(p=>p-1)}>Anterior</button><span>Página {page} / {Math.max(1,Math.ceil(numbers.length/perPage))}</span><button disabled={page>=Math.ceil(numbers.length/perPage)} onClick={()=>setPage(p=>p+1)}>Próxima</button></div></section>
  {selected.length>0&&<section className="checkout-sheet"><div><strong>{selected.length} número(s)</strong><span>{money(total)}</span></div><input placeholder="Seu nome" value={name} onChange={e=>setName(e.target.value)}/><input inputMode="tel" placeholder="(00) 00000-0000" value={phone} onChange={e=>setPhone(maskPhone(e.target.value))}/><button disabled={!name.trim()||phone.length!==15} onClick={checkout}>Continuar para pagamento</button></section>}
 </main>;
}
