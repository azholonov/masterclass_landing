import { createHash } from "crypto";

export const PAYMENT_RECEIPT_BUCKET = "payment-receipts";
export const PAYMENT_RECEIPT_MAX_BYTES = 3 * 1024 * 1024;
export const paymentReceiptMimeTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;

export function hashPaymentReceiptToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isPaymentReceiptToken(token: string) {
  return /^[A-Za-z0-9_-]{40,100}$/.test(token);
}

export function getPaymentReceiptUploadUrl(token: string, requestUrl?: string) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
    || process.env.VERCEL_PROJECT_PRODUCTION_URL
    || process.env.VERCEL_URL;
  const candidate = configured
    ? configured.startsWith("http://") || configured.startsWith("https://") ? configured : `https://${configured}`
    : requestUrl;
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:") return null;
    return new URL(`/payment-receipt/${token}`, url.origin).toString();
  } catch {
    return null;
  }
}

export function extensionForPaymentReceipt(contentType: string) {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "application/pdf") return "pdf";
  return null;
}

export function matchesPaymentReceiptSignature(bytes: Uint8Array, contentType: string) {
  if (contentType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (contentType === "image/png") {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return signature.every((value, index) => bytes[index] === value);
  }
  if (contentType === "image/webp") {
    return bytes.length >= 12
      && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
      && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  if (contentType === "application/pdf") {
    return bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
  }
  return false;
}
