import { useCallback, useEffect, useMemo, useState } from "react";

type Raffle = {
  id: string;
  slug: string;
  title: string;
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  ticketPrice: string;
  numbersCount: number;
  drawAt?: string | null;
};

type Order = {
  id: string;
  raffleId: string;
  raffleTitle: string;
  buyerName: string;
  buyerPhone: string;
  total: string;
  status: string;
  createdAt: string;
};

const money = (value: number) =>
  `R$ ${value.toFixed(2).replace(".", ",")}`;

const statusLabel: Record<string, string> = {
  DRAFT: "Rascunho",
  ACTIVE: "Ativa",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
  PENDING: "Pendente",
  PAID: "Pago",
};

export default function AdminDashboardPage() {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [rafflesResponse, ordersResponse] = await Promise.all([
        fetch("/api/admin/raffles", { credentials: "include" }),
        fetch(
          `/api/admin/orders?status=${status}&search=${encodeURIComponent(search)}`,
          { credentials: "include" },
        ),
      ]);

      if (rafflesResponse.status === 401 || ordersResponse.status === 401) {
        window.location.assign(`/login?next=${encodeURIComponent("/admin")}`);
        return;
      }

      if (!rafflesResponse.ok || !ordersResponse.ok) {
        throw new Error("Não foi possível carregar o painel.");
      }

      const [rafflesData, ordersData] = await Promise.all([
        rafflesResponse.json() as Promise<{ raffles?: Raffle[] }>,
        ordersResponse.json() as Promise<{ orders?: Order[] }>,
      ]);

      setRaffles(rafflesData.raffles ?? []);
      setOrders(ordersData.orders ?? []);
    } catch {
      setError("Não foi possível carregar os dados do dashboard.");
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const paid = orders.filter((order) => order.status === "PAID");
    return {
      active: raffles.filter((raffle) => raffle.status === "ACTIVE").length,
      draft: raffles.filter((raffle) => raffle.status === "DRAFT").length,
      paidOrders: paid.length,
      pendingOrders: orders.filter((order) => order.status === "PENDING").length,
      revenue: paid.reduce((sum, order) => sum + Number(order.total), 0),
    };
  }, [orders, raffles]);

  const confirmPayment = async (order: Order) => {
    if (order.status !== "PENDING") return;
    const response = await fetch(`/api/admin/orders/${order.id}/confirm-payment`, {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) {
      setError("Não foi possível confirmar o pagamento.");
      return;
    }
    await load();
  };

  return (
    <main className="admin-dashboard">
      <header className="admin-header">
        <div>
          <span className="section-label">RIFA X · ADMIN</span>
          <h1>Dashboard</h1>
          <p>Acompanhe suas rifas, pedidos e pagamentos.</p>
        </div>
        <a className="primary-button" href="/admin/rifas/nova">
          + Nova rifa
        </a>
      </header>

      {error && <p role="alert">{error}</p>}

      <section className="stats-grid" aria-label="Resumo">
        <article><span>Rifas ativas</span><strong>{stats.active}</strong></article>
        <article><span>Rascunhos</span><strong>{stats.draft}</strong></article>
        <article><span>Pedidos pagos</span><strong>{stats.paidOrders}</strong></article>
        <article><span>Faturamento</span><strong>{money(stats.revenue)}</strong></article>
      </section>

      <section className="raffle-list">
        <div className="list-header">
          <div><span className="section-label">RIFAS</span><h2>Suas rifas</h2></div>
          <a href="/admin/rifas">Ver todas</a>
        </div>
        {loading ? <p>Carregando…</p> : raffles.length === 0 ? (
          <div className="empty"><strong>Nenhuma rifa encontrada</strong><p>Crie sua primeira rifa para começar.</p></div>
        ) : raffles.slice(0, 6).map((raffle) => (
          <a className="raffle-row" href={`/admin/rifas/${raffle.id}`} key={raffle.id}>
            <div><strong>{raffle.title}</strong><small>/{raffle.slug} · {raffle.numbersCount} números · {money(Number(raffle.ticketPrice))}</small></div>
            <span className={`status status-${raffle.status.toLowerCase()}`}>{statusLabel[raffle.status]}</span>
            <b>›</b>
          </a>
        ))}
      </section>

      <section className="admin-panel">
        <div className="panel-header">
          <div><span className="section-label">PEDIDOS</span><h2>Pagamentos</h2></div>
          <div className="order-tools">
            <input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void load(); }} placeholder="Buscar nome, telefone ou pedido" />
            <button onClick={() => void load()}>Buscar</button>
          </div>
        </div>
        <nav className="admin-filters" aria-label="Filtro de pedidos">
          {["ALL", "PENDING", "PAID", "CANCELLED"].map((value) => (
            <button key={value} className={status === value ? "active" : ""} onClick={() => setStatus(value)}>
              {value === "ALL" ? "Todos" : statusLabel[value]}
            </button>
          ))}
        </nav>
        <div className="order-list">
          {!loading && orders.length === 0 && <div className="empty"><strong>Nenhum pedido encontrado</strong><p>Ajuste o filtro ou aguarde novas vendas.</p></div>}
          {orders.map((order) => (
            <article className="order-row" key={order.id}>
              <div><strong>{order.buyerName}</strong><span>{order.buyerPhone} · {order.raffleTitle}</span></div>
              <strong>{money(Number(order.total))}</strong>
              <span className={`status status-${order.status.toLowerCase()}`}>{statusLabel[order.status] ?? order.status}</span>
              {order.status === "PENDING" && <button onClick={() => void confirmPayment(order)}>Confirmar Pix</button>}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
