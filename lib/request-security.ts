import { createHmac } from "crypto";
import { createSupabaseAdmin } from "@/lib/supabase";

type JsonResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: "invalid" | "too_large" };

export async function readJsonBody<T>(request: Request, maxBytes: number): Promise<JsonResult<T>> {
  if (!request.body) return { ok: false, reason: "invalid" };

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return { ok: false, reason: "too_large" };
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytesRead = 0;
  let raw = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      bytesRead += value.byteLength;
      if (bytesRead > maxBytes) {
        await reader.cancel();
        return { ok: false, reason: "too_large" };
      }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
    return { ok: true, value: JSON.parse(raw) as T };
  } catch {
    return { ok: false, reason: "invalid" };
  } finally {
    reader.releaseLock();
  }
}

export function getClientIp(request: Request) {
  const forwarded = (
    request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for")
  )?.split(",")[0]?.trim();
  const candidate = forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
  return candidate.slice(0, 64);
}

export async function verifyTurnstileToken(token: string, clientIp: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return null;

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token, remoteip: clientIp }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;

    const result = (await response.json()) as { success?: unknown; action?: unknown };
    return result.success === true && result.action === "registration";
  } catch (error) {
    console.error("Turnstile verification error:", error instanceof Error ? error.name : "unknown");
    return null;
  }
}

function hashRateLimitKey(action: string, identifiers: string[]) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return null;

  return createHmac("sha256", secret)
    .update([action, ...identifiers].join("\0"))
    .digest("hex");
}

export async function consumeRateLimit(input: {
  action: string;
  identifiers: string[];
  limit: number;
  windowSeconds: number;
}) {
  const supabase = createSupabaseAdmin();
  const keyHash = hashRateLimitKey(input.action, input.identifiers);
  if (!supabase || !keyHash) return null;

  const { data, error } = await supabase
    .rpc("consume_api_rate_limit", {
      rate_action: input.action,
      rate_key_hash: keyHash,
      rate_limit: input.limit,
      rate_window_seconds: input.windowSeconds,
    })
    .single();

  if (error || !data) {
    console.error("Rate limit error:", error?.code);
    return null;
  }

  const result = data as { allowed?: unknown; retry_after?: unknown };
  if (typeof result.allowed !== "boolean" || typeof result.retry_after !== "number") {
    return null;
  }

  return { allowed: result.allowed, retryAfter: result.retry_after };
}
