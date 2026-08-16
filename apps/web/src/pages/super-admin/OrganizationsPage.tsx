import { useEffect, useState } from "react";

type Organization = {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
};

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/super-admin/organizations", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Acesso não autorizado.");
        const data = await response.json();
        setOrganizations(data.organizations ?? []);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleStatus = async (organization: Organization) => {
    const status = organization.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const response = await fetch(`/api/super-admin/organizations/${organization.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status }),
    });
    if (!response.ok) return;
    const data = await response.json();
    setOrganizations((items) => items.map((item) => item.id === organization.id ? data.organization : item));
  };

  if (loading) return <main className="admin-dashboard"><p>Carregando organizações…</p></main>;
  if (error) return <main className="admin-dashboard"><h1>{error}</h1></main>;

  return (
    <main className="admin-dashboard">
      <header>
        <div>
          <span className="section-label">RIFA X · SUPER ADMIN</span>
          <h1>Organizações</h1>
          <p>Gerencie as organizações cadastradas na plataforma.</p>
        </div>
        <a href="/super-admin/organizations/new" className="primary-button">+ Organização</a>
      </header>

      <section className="raffle-list">
        <div className="list-header">
          <h2>{organizations.length} organização(ões)</h2>
          <a href="/super-admin">Dashboard</a>
        </div>

        {organizations.length === 0 ? (
          <div className="empty">
            <strong>Nenhuma organização cadastrada</strong>
            <p>Crie a primeira organização para começar.</p>
          </div>
        ) : (
          organizations.map((organization) => (
            <div className="raffle-row" key={organization.id}>
              <div>
                <strong>{organization.name}</strong>
                <small>/{organization.slug}</small>
              </div>
              <span className={`status status-${organization.status.toLowerCase()}`}>{organization.status}</span>
              <button type="button" onClick={() => toggleStatus(organization)}>
                {organization.status === "ACTIVE" ? "Desativar" : "Ativar"}
              </button>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
