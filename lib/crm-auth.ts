import { createHmac, scryptSync, timingSafeEqual } from "crypto";

export const CRM_SESSION_COOKIE = process.env.NODE_ENV === "production"
  ? "__Host-masterclass_crm_session"
  : "masterclass_crm_session";
export const CRM_SESSION_MAX_AGE = 60 * 60 * 12;

const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;

type SessionPayload = {
  username: string;
  expiresAt: number;
};

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function parsePasswordHash(value: string) {
  const [algorithm, nValue, rValue, pValue, saltValue, hashValue, extra] = value.split("$");
  const cost = Number(nValue);
  const blockSize = Number(rValue);
  const parallelization = Number(pValue);

  if (
    algorithm !== "scrypt" || extra || !saltValue || !hashValue ||
    cost !== 32768 || blockSize !== 8 || parallelization !== 1
  ) return null;

  try {
    const salt = Buffer.from(saltValue, "base64url");
    const hash = Buffer.from(hashValue, "base64url");
    if (salt.length !== 16 || hash.length !== SCRYPT_KEY_LENGTH) return null;
    return { cost, blockSize, parallelization, salt, hash };
  } catch {
    return null;
  }
}

function getConfig() {
  const username = process.env.CRM_USERNAME;
  const passwordHash = process.env.CRM_PASSWORD_HASH;
  const secret = process.env.CRM_SESSION_SECRET;

  if (!username || !passwordHash || !secret || secret.length < 32) return null;
  const parsedPasswordHash = parsePasswordHash(passwordHash);
  if (!parsedPasswordHash) return null;
  return { username, parsedPasswordHash, secret };
}

export function isCrmConfigured() {
  return getConfig() !== null;
}

export function validateCrmCredentials(username: string, password: string) {
  const config = getConfig();
  if (!config) return false;

  const { cost, blockSize, parallelization, salt, hash } = config.parsedPasswordHash;
  const candidateHash = scryptSync(password, salt, SCRYPT_KEY_LENGTH, {
    N: cost,
    r: blockSize,
    p: parallelization,
    maxmem: SCRYPT_MAX_MEMORY,
  });
  const usernameMatches = safeEqual(username, config.username);
  const passwordMatches = timingSafeEqual(candidateHash, hash);
  return usernameMatches && passwordMatches;
}

export function createCrmSession(username: string) {
  const config = getConfig();
  if (!config || !safeEqual(username, config.username)) return null;

  const payload: SessionPayload = {
    username,
    expiresAt: Date.now() + CRM_SESSION_MAX_AGE * 1000,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", config.secret).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

export function verifyCrmSession(token: string | undefined) {
  const config = getConfig();
  if (!config || !token) return false;

  const [encodedPayload, signature, extra] = token.split(".");
  if (!encodedPayload || !signature || extra) return false;

  const expected = createHmac("sha256", config.secret).update(encodedPayload).digest("base64url");
  if (!safeEqual(signature, expected)) return false;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString()) as SessionPayload;
    return safeEqual(payload.username, config.username) && payload.expiresAt > Date.now();
  } catch {
    return false;
  }
}
