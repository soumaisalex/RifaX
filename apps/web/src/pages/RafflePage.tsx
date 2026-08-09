import { useEffect, useState } from "react";
import "../styles/raffle.css";

type NumberItem = { number: number; status: "AVAILABLE" | "RESERVED" | "SOLD" };
type Raffle = { id: string; title: string; description?: string | null; bannerUrl?: string | null; ticketPrice: string; numbersCount: number; prizes: { title: string; description?: string | null; imageUrl?: string | null }[]; stats: { sold: number; available: number; reserved: number; participants: number; progressPercent: number } };

export default function RafflePage({ slug }: { slug: string }) {
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [numbers, setNumbers] = useState<NumberItem[]>([]);
  const [selected, setSelected] = useState<number[]>([]);

  useEffect(() => { fetch(`/api/raffles/${slug}`).then((r) => r.json()).then(setRaffle); }, [slug]);
  useEffect(() => { if (raffle) fetch(`/api/raffles/${raffle.id}/numbers?page=1&limit=100`).then((r) => r.json()).then((data) => setNumbers(data.numbers)); }, [raffle]);
  if (!raffle) return <main className="raffle-page"><div className="loading">Carregando rifa…</div></main>;

  const toggleNumber = (item: NumberItem) => { if (item.status !== "AVAILABLE") return; setSelected((current) => current.includes(item.number) ? current.filter((n) => n !== item.number) : [...current, item.number]); };
  const total = Number(raffle.ticketPrice) * selected.length;

  return <main className="raffle-page">
    <section className="raffle-hero">{raffle.bannerUrl && <img src={raffle.bannerUrl} alt="" className="raffle-banner" />}<div className="raffle-content"><span className="eyebrow">RIFA</span><h1>{raffle.title}</h1>{raffle.description && <p>{raffle.description}</p>}</div></section>
    {raffle.prizes.length > 0 && <section className="prize-card"><span className="section-label">PRÊMIO</span><h2>{raffle.prizes[0].title}</h2>{raffle.prizes[0].description && <p>{raffle.prizes[0].description}</p>}</section>}
    <section className="progress-card"><div className="progress-heading"><strong>{raffle.stats.progressPercent}% vendido</strong><span>{raffle.stats.sold} / {raffle.numbersCount}</span></div><div className="progress-track"><div className="progress-value" style={{ width: `${raffle.stats.progressPercent}%` }} /></div><div className="participant-count">{raffle.stats.participants} participantes</div></section>
    <section className="numbers-section"><div className="numbers-heading"><div><span className="section-label">ESCOLHA SEUS NÚMEROS</span><h2>Toque para selecionar</h2></div><span className="selected-count">{selected.length} selecionado{selected.length === 1 ? "" : "s"}</span></div><div className="legend"><span><i className="dot available" />Disponível</span><span><i className="dot reserved" />Reservado</span><span><i className="dot sold" />Vendido</span></div><div className="number-grid">{numbers.map((item) => <button key={item.number} className={`number ${item.status.toLowerCase()} ${selected.includes(item.number) ? "selected" : ""}`} disabled={item.status !== "AVAILABLE"} onClick={() => toggleNumber(item)}>{String(item.number).padStart(3, "0")}</button>)}</div></section>
    {selected.length > 0 && <div className="purchase-bar"><div><strong>{selected.length} número{selected.length > 1 ? "s" : ""}</strong><span>R$ {total.toFixed(2).replace(".", ",")}</span></div><button>Continuar</button></div>}
  </main>;
}
