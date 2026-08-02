import { createHmac, timingSafeEqual } from "crypto";

export const GUIDE_SESSION_COOKIE = process.env.NODE_ENV === "production"
  ? "__Host-masterclass_guide_session"
  : "masterclass_guide_session";
export const GUIDE_SESSION_MAX_AGE = 60 * 60 * 24 * 30;
export const activeGuideStatuses = ["new", "confirmed"] as const;

type GuideSessionPayload = {
  participantId: string;
  accessTokenHash: string;
  expiresAt: number;
};

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function getGuideSecret() {
  const secret = process.env.GUIDE_SESSION_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function isGuideAuthConfigured() {
  return getGuideSecret() !== null;
}

export function createGuideSession(participantId: string, accessTokenHash: string) {
  const secret = getGuideSecret();
  if (!secret || !isUuid(participantId) || !/^[0-9a-f]{64}$/.test(accessTokenHash)) return null;

  const payload: GuideSessionPayload = {
    participantId,
    accessTokenHash,
    expiresAt: Date.now() + GUIDE_SESSION_MAX_AGE * 1000,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

export function verifyGuideSession(token: string | undefined) {
  const secret = getGuideSecret();
  if (!secret || !token) return null;

  const [encodedPayload, signature, extra] = token.split(".");
  if (!encodedPayload || !signature || extra) return null;

  const expected = createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  if (!safeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString()) as GuideSessionPayload;
    if (
      !isUuid(payload.participantId) ||
      !/^[0-9a-f]{64}$/.test(payload.accessTokenHash) ||
      payload.expiresAt <= Date.now()
    ) return null;
    return { participantId: payload.participantId, accessTokenHash: payload.accessTokenHash };
  } catch {
    return null;
  }
}

export function getGuideAccessUrl(token: string, requestUrl?: string) {
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
    return new URL(`/guide/access/${token}`, url.origin).toString();
  } catch {
    return null;
  }
}
