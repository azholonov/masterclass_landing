import { NextResponse } from "next/server";
import {
  CRM_SESSION_COOKIE,
  CRM_SESSION_MAX_AGE,
  createCrmSession,
  isCrmConfigured,
  validateCrmCredentials,
} from "@/lib/crm-auth";
import { consumeRateLimit, getClientIp, readJsonBody } from "@/lib/request-security";

type LoginPayload = { username?: unknown; password?: unknown };

export async function POST(request: Request) {
  if (!isCrmConfigured()) {
    return NextResponse.json(
      { message: "CRM не настроена. Проверьте переменные окружения." },
      { status: 503 },
    );
  }

  const body = await readJsonBody<LoginPayload>(request, 2_048);
  if (!body.ok) {
    return NextResponse.json(
      { message: body.reason === "too_large" ? "Запрос слишком большой." : "Некорректный запрос." },
      { status: body.reason === "too_large" ? 413 : 400 },
    );
  }

  const username = typeof body.value.username === "string" ? body.value.username : "";
  const password = typeof body.value.password === "string" ? body.value.password : "";
  if (username.length > 200 || password.length > 256) {
    return NextResponse.json({ message: "Неверный логин или пароль." }, { status: 401 });
  }

  const clientIp = getClientIp(request);
  const [ipLimit, credentialLimit] = await Promise.all([
    consumeRateLimit({
      action: "crm_login_ip",
      identifiers: [clientIp],
      limit: 10,
      windowSeconds: 15 * 60,
    }),
    consumeRateLimit({
      action: "crm_login_credential",
      identifiers: [clientIp, username.toLowerCase()],
      limit: 5,
      windowSeconds: 15 * 60,
    }),
  ]);

  if (!ipLimit || !credentialLimit) {
    return NextResponse.json({ message: "Вход временно недоступен." }, { status: 503 });
  }

  const blockedLimit = [ipLimit, credentialLimit].find((result) => !result.allowed);
  if (blockedLimit) {
    return NextResponse.json(
      { message: "Слишком много попыток входа. Попробуйте позже." },
      { status: 429, headers: { "Retry-After": String(blockedLimit.retryAfter) } },
    );
  }

  if (!validateCrmCredentials(username, password)) {
    return NextResponse.json({ message: "Неверный логин или пароль." }, { status: 401 });
  }

  const token = createCrmSession(username);
  if (!token) {
    return NextResponse.json({ message: "Не удалось создать сессию." }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(CRM_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: CRM_SESSION_MAX_AGE,
    priority: "high",
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
