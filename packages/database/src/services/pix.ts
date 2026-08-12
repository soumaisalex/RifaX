const CRC16_POLYNOMIAL = 0x1021;

export type PixPayloadInput = {
  key: string;
  merchantName: string;
  merchantCity: string;
  amount: number;
  txid?: string;
};

function normalize(value: string, maxLength: number) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 .\-]/g, "")
    .trim()
    .slice(0, maxLength);
}

function field(id: string, value: string) {
  return `${id}${value.length.toString().padStart(2, "0")}${value}`;
}

function crc16(payload: string) {
  let crc = 0xffff;
  for (const char of payload) {
    crc ^= char.charCodeAt(0) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ CRC16_POLYNOMIAL) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function generatePixPayload(input: PixPayloadInput) {
  if (!input.key.trim()) throw new Error("Pix key is required");
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Pix amount must be greater than zero");

  const merchantName = normalize(input.merchantName, 25);
  const merchantCity = normalize(input.merchantCity, 15);
  const txid = normalize(input.txid ?? "***", 25) || "***";
  const amount = input.amount.toFixed(2);

  const merchantAccount = field(
    "26",
    field("00", "BR.GOV.BCB.PIX") + field("01", input.key.trim()),
  );

  const additionalData = field("62", field("05", txid));
  const payloadWithoutCrc =
    field("00", "01") +
    merchantAccount +
    field("52", "0000") +
    field("53", "986") +
    field("54", amount) +
    field("58", "BR") +
    field("59", merchantName) +
    field("60", merchantCity) +
    additionalData +
    "6304";

  return `${payloadWithoutCrc}${crc16(payloadWithoutCrc)}`;
}
