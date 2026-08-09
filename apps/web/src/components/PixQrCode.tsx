import { useEffect, useRef } from "react";

type Props = { payload: string; size?: number };

export function PixQrCode({ payload, size = 240 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    import("qrcode").then(({ default: QRCode }) => {
      if (!cancelled && canvasRef.current) {
        QRCode.toCanvas(canvasRef.current, payload, { width: size, margin: 2, errorCorrectionLevel: "M" });
      }
    });
    return () => { cancelled = true; };
  }, [payload, size]);

  return <canvas ref={canvasRef} aria-label="QR Code Pix" role="img" />;
}
