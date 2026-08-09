import { useEffect, useState } from "react";
import { PixQrCode } from "../components/PixQrCode";

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

  const copyPix = async () => {
    await navigator.clipboard.writeText(data.pix.payload);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const seconds = (secondsLeft % 60).toString().padStart(2, "0");
  const expired = secondsLeft === 0;

  return <main className="confirmation-page">
    <section className="confirmation-card">
      <span className="section-label">{expired ? "RESERVA EXPIRADA" : "PEDIDO RESERVADO"}</span>
      <h1>{expired ? "O tempo da reserva terminou" : "Finalize seu pagamento"}</h1>
      <p>{expired ? "Selecione os números novamente para criar uma nova reserva." : "Seus números estão reservados enquanto o pagamento não expirar."}</p>

      <div className={`countdown ${expired ? "expired" : ""}`}><span>Tempo restante</span><strong>{minutes}:{seconds}</strong></div>

      <div className="order-summary">
        <span>Números</span><strong>{data.numbers.map((number) => String(number).padStart(3, "0")).join(", ")}</strong>
        <span>Total</span><strong>R$ {Number(data.total).toFixed(2).replace(".", ",")}</strong>
      </div>

      {!expired && <div className="pix-box">
        <span className="section-label">PAGUE COM PIX</span>
        <PixQrCode payload={data.pix.payload} size={240} />
        <button onClick={copyPix}>{copied ? "Copiado!" : "Copiar código Pix"}</button>
        <details><summary>Ver Pix Copia e Cola</summary><code>{data.pix.payload}</code></details>
      </div>}

      <p className="payment-note">Após realizar o Pix, aguarde a confirmação do administrador.</p>
      <strong className="order-reference">Pedido #{data.orderId.slice(0, 8).toUpperCase()}</strong>
    </section>
  </main>;
}
