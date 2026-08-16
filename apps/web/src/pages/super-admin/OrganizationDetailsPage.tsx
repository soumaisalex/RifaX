import { useEffect, useState } from "react";

type Organization = { id: string; name: string; slug: string; status: "ACTIVE" | "INACTIVE"; createdAt: string };
type Admin = { id: string; organizationId: string; name: string; email: string; status: string; createdAt: string };

export default function OrganizationDetailsPage({ id }: { id: string }) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    const [organizationsResponse, adminsResponse] = await Promise.all([
      fetch("/api/super-admin/organizations", { credentials: "include" }),
      fetch("/api/auth/admins", { credentials: "include" }),
    ]);
    if (!organizationsResponse.ok) throw new Error("Acesso não autorizado.");
    const organizations = (await organizationsResponse.json()).organizations ?? [];
    const found = organizations.find((item: Organization) => item.id === id) ?? null;
    setOrganization(found);
    setName(found?.name ?? "");
    if (adminsResponse.ok) setAdmins(((await adminsResponse.json()).admins ?? []).filter((item: Admin) => item.organizationId === id));
  };

  useEffect(() => {
    load().catch((error: Error) => setMessage(error.message)).finally(() => setLoading(false));
  }, [id]);

  const save = async () => {
    if (!name.trim()) return setMessage("O nome é obrigatório.");
    setSaving(true);
    setMessage("");
    const response = await fetch(`/api/super-admin/organizations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: name.trim() }),
    });
    if (!response.ok) setMessage((await response.json()).error ?? "Não foi possível salvar.");
    else setOrganization((await response.json()).organization);
    setSaving(false);
  };

  const toggleStatus = async () => {
    if (!organization) return;
    const status = organization.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const response = await fetch(`/api/super-admin/organizations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status }),
    });
    if (!response.ok) return setMessage("Não foi possível alterar o status.");
    setOrganization((await response.json()).organization);
  };

  const remove = async () => {
    if (!organization || !window.confirm(`Desativar e remover a organização “${organization.name}”?`)) return;
    const response = await fetch(`/api/super-admin/organizations/${id}`, { method: "DELETE", credentials: "include" });
    if (!response.ok) return setMessage((await response.json()).error ?? "Não foi possível remover.");
    window.location.href = "/super-admin/organizations";
  };

  if (loading) return <main className="admin-dashboard"><p>Carregando organização…</p></main>;
  if (!organization) return <main className="admin-dashboard"><h1>Organização não encontrada</h1><a href="/super-admin/organizations">Voltar</a></main>;

  return (
    <main className="admin-form">
      <header>
        <span className="section-label">RIFA X · SUPER ADMIN</span>
        <h1>{organization.name}</h1>
        <p>/{organization.slug}</p>
      </header>
      <section>
        <h2>Dados da organização</h2>
        <label>Nome<input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>Slug<input value={organization.slug} disabled /></label>
        <div>
          <button type="button" onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar alterações"}</button>
          <button type="button" onClick={toggleStatus}>{organization.status === "ACTIVE" ? "Desativar" : "Ativar"}</button>
          <button type="button" onClick={remove}>Remover</button>
        </div>
      </section>
      <section>
        <h2>Administradores ({admins.length})</h2>
        {admins.length === 0 ? <p>Nenhum administrador cadastrado.</p> : admins.map((admin) => <div className="raffle-row" key={admin.id}><div><strong>{admin.name}</strong><small>{admin.email}</small></div><span className={`status status-${admin.status.toLowerCase()}`}>{admin.status}</span></div>)}
      </section>
      {message && <p role="status">{message}</p>}
      <a href="/super-admin/organizations">← Voltar para organizações</a>
    </main>
  );
}
