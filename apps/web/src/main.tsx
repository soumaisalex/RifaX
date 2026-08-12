import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import PublicRafflePage from "./pages/PublicRafflePage";
import OrderConfirmationPage from "./pages/OrderConfirmationPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import SuperAdminDashboardPage from "./pages/super-admin/SuperAdminDashboardPage";
import RaffleResultPage from "./pages/public/RaffleResultPage";
import CheckoutPage from "./pages/public/CheckoutPage";

function CheckoutRoute({ slug }: { slug: string }) {
  const [raffle, setRaffle] = useState<{ id: string; title: string; ticketPrice: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/public/raffles/${slug}`)
      .then((response) => (response.ok ? response.json() : null))
      .then(setRaffle)
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <main><p>Carregando…</p></main>;
  if (!raffle) return <main><h1>Rifa não encontrada</h1></main>;

  const params = new URLSearchParams(window.location.search);
  const selectedNumbers = (params.get("numbers") ?? "")
    .split(",")
    .map(Number)
    .filter(Number.isFinite);

  return (
    <CheckoutPage
      raffleId={raffle.id}
      raffleTitle={raffle.title}
      selectedNumbers={selectedNumbers}
      ticketPrice={Number(raffle.ticketPrice)}
    />
  );
}

function App() {
  const path = window.location.pathname;
  const parts = path.split("/").filter(Boolean);

  if (parts[0] === "admin") return <AdminDashboardPage />;
  if (parts[0] === "super-admin") return <SuperAdminDashboardPage />;
  if (parts[0] === "pedido" && parts[1]) return <OrderConfirmationPage token={parts[1]} />;
  if (parts[0] === "resultado" && parts[1]) return <RaffleResultPage />;
  if (parts[0] === "r" && parts[1] && parts[2] === "checkout") return <CheckoutRoute slug={parts[1]} />;
  if (parts[0] === "r" && parts[1]) return <PublicRafflePage slug={parts[1]} />;

  return (
    <main>
      <h1>Rifa X</h1>
      <p>Plataforma de rifas online.</p>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
