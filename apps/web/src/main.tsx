import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import PublicRafflePage from "./pages/PublicRafflePage";
import OrderConfirmationPage from "./pages/OrderConfirmationPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminRafflesPage from "./pages/AdminRafflesPage";
import AdminRaffleEditorPage from "./pages/AdminRaffleEditorPage";
import AdminRaffleNumbersPage from "./pages/AdminRaffleNumbersPage";
import SuperAdminDashboardPage from "./pages/super-admin/SuperAdminDashboardPage";
import RaffleResultPage from "./pages/public/RaffleResultPage";
import CheckoutPage from "./pages/public/CheckoutPage";
import OrdersPage from "./pages/admin/OrdersPage";
import OrderDetailsPage from "./pages/admin/OrderDetailsPage";
import RaffleDetailPage from "./pages/admin/RaffleDetailPage";
import DrawPage from "./pages/admin/DrawPage";
import LoginPage from "./pages/LoginPage";
import AuthGate from "./auth/AuthGate";

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

  return <CheckoutPage raffleId={raffle.id} raffleTitle={raffle.title} selectedNumbers={selectedNumbers} ticketPrice={Number(raffle.ticketPrice)} />;
}

function AdminRoute({ parts }: { parts: string[] }) {
  if (parts.length === 1) return <AdminDashboardPage />;
  if (parts[1] === "rifas" && parts[2] === "nova") return <AdminRaffleEditorPage />;
  if (parts[1] === "rifas" && parts.length === 2) return <AdminRafflesPage />;
  if (parts[1] === "rifas" && parts[2] && parts[3] === "edit") return <AdminRaffleEditorPage raffleId={parts[2]} />;
  if (parts[1] === "rifas" && parts[2] && parts[3] === "numeros") return <AdminRaffleNumbersPage raffleId={parts[2]} />;
  if (parts[1] === "rifas" && parts[2]) return <RaffleDetailPage id={parts[2]} />;
  if (parts[1] === "orders" && parts[2]) return <OrderDetailsPage id={parts[2]} />;
  if (parts[1] === "orders") return <OrdersPage />;
  if (parts[1] === "draws" && parts[2]) return <DrawPage />;
  return <AdminDashboardPage />;
}

function App() {
  const path = window.location.pathname;
  const parts = path.split("/").filter(Boolean);

  if (parts[0] === "login") return <LoginPage />;
  if (parts[0] === "admin") {
    return <AuthGate roles={["ORGANIZATION_ADMIN", "COLLABORATOR", "SUPER_ADMIN"]} loginPath="/login"><AdminRoute parts={parts} /></AuthGate>;
  }
  if (parts[0] === "super-admin") return <AuthGate roles={["SUPER_ADMIN"]} loginPath="/login"><SuperAdminDashboardPage /></AuthGate>;
  if (parts[0] === "pedido" && parts[1]) return <OrderConfirmationPage token={parts[1]} />;
  if (parts[0] === "resultado" && parts[1]) return <RaffleResultPage />;
  if (parts[0] === "r" && parts[1] && parts[2] === "checkout") return <CheckoutRoute slug={parts[1]} />;
  if (parts[0] === "r" && parts[1]) return <PublicRafflePage slug={parts[1]} />;

  return <main><h1>Rifa X</h1><p>Plataforma de rifas online.</p></main>;
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
