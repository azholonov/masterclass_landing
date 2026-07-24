import { NextResponse } from "next/server";
import {
  CRM_SESSION_COOKIE,
  CRM_SESSION_MAX_AGE,
  createCrmSession,
  isCrmConfigured,
  validateCrmCredentials,
} from "@/lib/crm-auth";

type LoginPayload = { username?: unknown; password?: unknown };

export async function POST(request: Request) {
  if (!isCrmConfigured()) {
    return NextResponse.json(
      { message: "CRM не настроена. Проверьте переменные окружения." },
      { status: 503 },
    );
  }

  let payload: LoginPayload;
  try {
    payload = (await request.json()) as LoginPayload;
  } catch {
    return NextResponse.json({ message: "Некорректный запрос." }, { status: 400 });
  }

  const username = typeof payload.username === "string" ? payload.username : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  if (username.length > 200 || password.length > 256) {
    return NextResponse.json({ message: "Неверный логин или пароль." }, { status: 401 });
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
