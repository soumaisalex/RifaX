import { useEffect, useState } from "react";

export type ConfirmationData = {
  orderId: string;
  numbers: number[];
  total: string;
  reservationExpiresAt: string;
  pix: { payload: string };
};

export function ConfirmationPage({ data }: { data: ConfirmationData }) {
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, Math.floor((new Date(data.reservationExpiresAt).getTime() - Date.now()) / 1000)));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setSecondsLeft(Math.max(0, Math.floor((new Date(data.reservationExpiresAt).getTime() - Date.now()) / 1000))), 1000);
    return () => window.clearInterval(timer);
  }, [data.reservationExpiresAt]);

  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const seconds = (secondsLeft % 60).toString().padStart(2, "0");

  const copyPix = async () => {
    await navigator.clipboard.writeText(data.pix.payload);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return <main className="confirmation-page">
    <section className="confirmation-card">
      <span className="section-label">PEDIDO RESERVADO</span>
      <h1>Finalize seu pagamento</h1>
      <p>Seus números estão reservados enquanto o pagamento não expirar.</p>

      <div className="countdown"><span>Tempo restante</span><strong>{minutes}:{seconds}</strong></div>

      <div className="order-summary">
        <span>Números</span><strong>{data.numbers.map((number) => String(number).padStart(3, "0")).join(", ")}</strong>
        <span>Total</span><strong>R$ {Number(data.total).toFixed(2).replace(".", ",")}</strong>
      </div>

      <div className="pix-box">
        <span className="section-label">PIX COPIA E COLA</span>
        <code>{data.pix.payload}</code>
        <button onClick={copyPix}>{copied ? "Copiado!" : "Copiar código Pix"}</button>
      </div>

      <p className="payment-note">Após realizar o Pix, aguarde a confirmação do administrador.</p>
      <strong className="order-reference">Pedido #{data.orderId.slice(0, 8).toUpperCase()}</strong>
    </section>
  </main>;
}
