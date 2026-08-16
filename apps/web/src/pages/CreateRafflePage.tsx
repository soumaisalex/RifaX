import { FormEvent, useEffect, useState } from "react";

type Me = { role: "SUPER_ADMIN" | "ORGANIZATION_ADMIN" | "COLLABORATOR"; organizationId?: string | null };

export default function CreateRafflePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [form, setForm] = useState({ title: "", slug: "", description: "", ticketPrice: "10.00", numbersCount: "100", drawMethod: "RIFA_X", drawAt: "", pixKey: "", pixCity: "Aracaju" });
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false); const [created, setCreated] = useState<string | null>(null);

  useEffect(() => { fetch("/api/auth/me").then(async r => { if (!r.ok) { window.location.replace("/admin/login"); return; } const d = await r.json(); setMe(d.user); }); }, []);
  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      if (!me?.organizationId && me?.role !== "SUPER_ADMIN") throw new Error("Sua conta não possui uma organização vinculada.");
      const response = await fetch("/api/admin/raffles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, numbersCount: Number(form.numbersCount), organizationId: me?.organizationId || undefined }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Não foi possível criar a rifa.");
      const raffleId = data.raffle?.id; if (!raffleId) throw new Error("A API não retornou a rifa criada.");
      const publish = await fetch(`/api/admin/raffles/${raffleId}/publish`, { method: "POST" });
      if (!publish.ok) throw new Error("A rifa foi criada, mas não pôde ser publicada.");
      setCreated(data.raffle.slug);
    } catch (err) { setError(err instanceof Error ? err.message : "Erro ao criar rifa."); }
    finally { setLoading(false); }
  }

  if (created) return <main className="auth-shell"><section className="success-card"><span className="eyebrow">RIFA PUBLICADA</span><h1>{form.title}</h1><p>Sua rifa está ativa e pronta para receber participantes.</p><div className="success-url">/r/{created}</div><div className="home-actions"><a className="button primary" href={`/r/${created}`}>Abrir rifa</a><a className="button secondary" href="/admin">Voltar ao painel</a></div></section></main>;

  return <main className="admin-form-shell"><form className="admin-form" onSubmit={submit}><header><a className="back-link" href="/admin">← Dashboard</a><span className="eyebrow">NOVA RIFA</span><h1>Criar rifa</h1><p>Preencha os dados básicos. A publicação acontece automaticamente.</p></header>
    <div className="form-grid"><label>Título<input value={form.title} onChange={e=>update("title",e.target.value)} required /></label><label>Slug<input value={form.slug} onChange={e=>update("slug",e.target.value)} placeholder="ex: rifa-do-carro" required /></label><label>Valor por número<input type="number" min="0.01" step="0.01" value={form.ticketPrice} onChange={e=>update("ticketPrice",e.target.value)} required /></label><label>Quantidade de números<input type="number" min="1" step="1" value={form.numbersCount} onChange={e=>update("numbersCount",e.target.value)} required /></label><label>Método do sorteio<select value={form.drawMethod} onChange={e=>update("drawMethod",e.target.value)}><option value="RIFA_X">Rifa X</option><option value="FEDERAL_LOTTERY">Loteria Federal</option></select></label><label>Data do sorteio<input type="datetime-local" value={form.drawAt} onChange={e=>update("drawAt",e.target.value)} /></label><label className="wide">Descrição<textarea value={form.description} onChange={e=>update("description",e.target.value)} rows={4} /></label><label>Chave Pix<input value={form.pixKey} onChange={e=>update("pixKey",e.target.value)} placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória" required /></label><label>Cidade do Pix<input value={form.pixCity} onChange={e=>update("pixCity",e.target.value)} required /></label></div>
    {me?.role === "SUPER_ADMIN" && <p className="form-note">Conta Super Admin: selecione uma organização pelo fluxo de administração antes de criar rifas para uma organização específica.</p>}
    {error && <div className="form-error">{error}</div>}<button className="button primary" disabled={loading}>{loading ? "Criando…" : "Criar e publicar rifa"}</button>
  </form></main>;
}
