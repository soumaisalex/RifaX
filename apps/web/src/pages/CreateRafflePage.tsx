import { FormEvent, useEffect, useState } from "react";

type Me = { role: "SUPER_ADMIN" | "ORGANIZATION_ADMIN" | "COLLABORATOR"; organizationId?: string | null };
type Prize = { title: string; description: string; imageUrl: string };
const newPrize = (): Prize => ({ title: "", description: "", imageUrl: "" });

export default function CreateRafflePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [form, setForm] = useState({ title: "", slug: "", description: "", bannerUrl: "", ticketPrice: "10.00", numbersCount: "100", drawMethod: "RIFA_X", drawAt: "", pixKey: "", pixCity: "Aracaju" });
  const [prizes, setPrizes] = useState<Prize[]>([newPrize()]);
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false); const [created, setCreated] = useState<string | null>(null);

  useEffect(() => { fetch("/api/auth/me").then(async r => { if (!r.ok) { window.location.replace("/admin/login"); return; } const d = await r.json(); setMe(d.user); }); }, []);
  const update = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      if (!me?.organizationId && me?.role !== "SUPER_ADMIN") throw new Error("Sua conta não possui uma organização vinculada.");
      const payload = { ...form, numbersCount: Number(form.numbersCount), organizationId: me?.organizationId || undefined, prizes: prizes.filter((prize) => prize.title.trim()).map((prize) => ({ title: prize.title.trim(), description: prize.description.trim() || undefined, imageUrl: prize.imageUrl.trim() || undefined })) };
      if (!payload.prizes.length) throw new Error("Informe pelo menos um prêmio.");
      const response = await fetch("/api/admin/raffles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
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

  return <main className="admin-form-shell"><form className="admin-form" onSubmit={submit}><header><a className="back-link" href="/admin">← Dashboard</a><span className="eyebrow">NOVA RIFA</span><h1>Criar rifa</h1><p>Configure a rifa, os prêmios, o sorteio e o recebimento Pix.</p></header>
    <section><h2>Identidade</h2><div className="form-grid"><label>Título<input value={form.title} onChange={e=>update("title",e.target.value)} required /></label><label>Slug<input value={form.slug} onChange={e=>update("slug",e.target.value.toLowerCase().replace(/\s+/g,"-"))} placeholder="ex: rifa-do-carro" required /></label><label className="wide">Descrição<textarea value={form.description} onChange={e=>update("description",e.target.value)} rows={4} /></label><label className="wide">URL do banner<input value={form.bannerUrl} onChange={e=>update("bannerUrl",e.target.value)} placeholder="https://..." /></label></div></section>
    <section><h2>Números e preço</h2><div className="form-grid"><label>Valor por número<input type="number" min="0.01" step="0.01" value={form.ticketPrice} onChange={e=>update("ticketPrice",e.target.value)} required /></label><label>Quantidade de números<input type="number" min="1" step="1" value={form.numbersCount} onChange={e=>update("numbersCount",e.target.value)} required /></label></div></section>
    <section><h2>Prêmios</h2>{prizes.map((prize,index)=><div className="prize-editor" key={index}><label>Prêmio {index+1}<input required={index===0} value={prize.title} onChange={e=>setPrizes(ps=>ps.map((p,i)=>i===index?{...p,title:e.target.value}:p))} placeholder="Ex.: Honda XRE 300" /></label><label>Descrição<textarea value={prize.description} onChange={e=>setPrizes(ps=>ps.map((p,i)=>i===index?{...p,description:e.target.value}:p))} placeholder="Detalhes do prêmio" /></label><label>Imagem do prêmio<input value={prize.imageUrl} onChange={e=>setPrizes(ps=>ps.map((p,i)=>i===index?{...p,imageUrl:e.target.value}:p))} placeholder="https://..." /></label>{prizes.length>1&&<button type="button" className="button secondary" onClick={()=>setPrizes(ps=>ps.filter((_,i)=>i!==index))}>Remover prêmio</button>}</div>)}<button type="button" className="button secondary" onClick={()=>setPrizes(ps=>[...ps,newPrize()])}>+ Adicionar prêmio</button></section>
    <section><h2>Sorteio</h2><div className="form-grid"><label>Método<select value={form.drawMethod} onChange={e=>update("drawMethod",e.target.value)}><option value="RIFA_X">Rifa X — sorteio ao vivo</option><option value="FEDERAL_LOTTERY">Loteria Federal</option></select></label><label>Data do sorteio<input type="datetime-local" value={form.drawAt} onChange={e=>update("drawAt",e.target.value)} /></label></div></section>
    <section><h2>Recebimento Pix</h2><div className="form-grid"><label>Chave Pix<input value={form.pixKey} onChange={e=>update("pixKey",e.target.value)} placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória" required /></label><label>Cidade do Pix<input value={form.pixCity} onChange={e=>update("pixCity",e.target.value)} maxLength={15} required /></label></div></section>
    {me?.role === "SUPER_ADMIN" && <p className="form-note">Conta Super Admin: o vínculo da organização é definido pelo fluxo de administração.</p>}
    {error && <div className="form-error">{error}</div>}<button className="button primary" disabled={loading}>{loading ? "Criando…" : "Criar e publicar rifa"}</button>
  </form></main>;
}
