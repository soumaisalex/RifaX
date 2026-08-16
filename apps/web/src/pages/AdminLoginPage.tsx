import { FormEvent, useEffect, useState } from "react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => { if (r.ok) window.location.replace("/admin"); });
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Não foi possível entrar.");
      window.location.replace("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally { setLoading(false); }
  }

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={submit}>
        <a className="back-link" href="/">← Rifa X</a>
        <span className="eyebrow">PAINEL ADMINISTRATIVO</span>
        <h1>Entrar</h1>
        <p>Acesse suas rifas, pedidos e pagamentos.</p>
        <label>E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label>
        <label>Senha<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label>
        {error && <div className="form-error">{error}</div>}
        <button className="button primary full" disabled={loading}>{loading ? "Entrando…" : "Entrar no painel"}</button>
      </form>
    </main>
  );
}
