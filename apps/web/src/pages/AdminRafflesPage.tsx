import { useEffect, useState } from "react";

type Raffle = { id: string; slug: string; title: string; status: string; ticketPrice: string; numbersCount: number; drawAt?: string | null; createdAt: string };
const statusLabel: Record<string, string> = { DRAFT: "Rascunho", ACTIVE: "Ativa", COMPLETED: "Concluída", CANCELLED: "Cancelada" };

export default function AdminRafflesPage() {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/raffles", { credentials: "include" });
      if (response.status === 401) { window.location.assign("/login"); return; }
      if (!response.ok) throw new Error();
      const data = await response.json();
      setRaffles(data.raffles ?? []);
    } catch { setError("Não foi possível carregar as rifas."); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);
  const filtered = status === "ALL" ? raffles : raffles.filter((raffle) => raffle.status === status);

  return <main className="admin-page">
    <header className="admin-header"><div><span className="section-label">RIFA X · ADMIN</span><h1>Minhas rifas</h1><p>Crie, publique e acompanhe suas rifas.</p></div><a href="/admin/rifas/nova" className="primary-button">+ Nova rifa</a></header>
    {error && <p role="alert">{error}</p>}
    <nav className="admin-filters">{[["ALL","Todas"],["DRAFT","Rascunhos"],["ACTIVE","Ativas"],["COMPLETED","Concluídas"],["CANCELLED","Canceladas"]].map(([value,label]) => <button key={value} className={status === value ? "active" : ""} onClick={() => setStatus(value)}>{label}</button>)}</nav>
    <section className="raffle-list">
      {loading ? <p>Carregando…</p> : filtered.length === 0 ? <p>Nenhuma rifa encontrada.</p> : filtered.map((raffle) => <article className="raffle-row" key={raffle.id}><a href={`/admin/rifas/${raffle.id}`}><strong>{raffle.title}</strong><span>/{raffle.slug}</span></a><div><span>{raffle.numbersCount} números</span><span>R$ {Number(raffle.ticketPrice).toFixed(2).replace(".", ",")}</span></div><span className={`status status-${raffle.status.toLowerCase()}`}>{statusLabel[raffle.status] ?? raffle.status}</span><a href={`/admin/rifas/${raffle.id}/numeros`}>Números</a></article>)}
    </section>
  </main>;
}
