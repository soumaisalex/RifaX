import { useEffect, useState } from "react";

type Raffle = { id: string; slug: string; title: string; status: string; ticketPrice: string; numbersCount: number; drawAt?: string | null; createdAt: string };

export default function AdminRafflesPage() {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [status, setStatus] = useState("ALL");

  useEffect(() => { fetch("/api/admin/raffles", { headers: { "x-rifa-role": "ADMIN" } }).then((r) => r.json()).then((data) => setRaffles(data.raffles ?? [])); }, []);
  const filtered = status === "ALL" ? raffles : raffles.filter((raffle) => raffle.status === status);

  return <main className="admin-page">
    <header className="admin-header"><div><span className="section-label">RIFA X</span><h1>Minhas rifas</h1></div><button>+ Nova rifa</button></header>
    <nav className="admin-filters">{["ALL", "DRAFT", "ACTIVE", "FINISHED"].map((item) => <button key={item} className={status === item ? "active" : ""} onClick={() => setStatus(item)}>{item === "ALL" ? "Todas" : item === "DRAFT" ? "Rascunhos" : item === "ACTIVE" ? "Ativas" : "Finalizadas"}</button>)}</nav>
    <section className="raffle-list">{filtered.map((raffle) => <article className="raffle-row" key={raffle.id}><div><strong>{raffle.title}</strong><span>/{raffle.slug}</span></div><div><span>{raffle.numbersCount} números</span><span>R$ {Number(raffle.ticketPrice).toFixed(2).replace(".", ",")}</span></div><span className={`status status-${raffle.status.toLowerCase()}`}>{raffle.status}</span></article>)}{filtered.length === 0 && <p>Nenhuma rifa encontrada.</p>}</section>
  </main>;
}
