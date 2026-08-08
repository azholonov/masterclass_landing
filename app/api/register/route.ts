import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { createSupabaseAdmin } from "@/lib/supabase";
import { sendWelcomeEmail } from "@/lib/email";
import { getGuideAccessUrl } from "@/lib/guide-auth";
import { notifyAdminAboutRegistration } from "@/lib/telegram";
import { isWorkshopId, workshops, type RegistrationStatus } from "@/lib/workshops";
import {
  consumeRateLimit,
  getClientIp,
  readJsonBody,
  verifyTurnstileToken,
} from "@/lib/request-security";

type RegistrationPayload = {
  name?: unknown;
  contact?: unknown;
  telegram?: unknown;
  workshop?: unknown;
  "cf-turnstile-response"?: unknown;
};

export async function POST(request: Request) {
  const body = await readJsonBody<RegistrationPayload>(request, 4_096);
  if (!body.ok) {
    return NextResponse.json(
      { message: body.reason === "too_large" ? "Данные формы слишком большие." : "Некорректные данные формы." },
      { status: body.reason === "too_large" ? 413 : 400 },
    );
  }

  const name = typeof body.value.name === "string" ? body.value.name.trim() : "";
  const contact = typeof body.value.contact === "string" ? body.value.contact.trim().toLowerCase() : "";
  const telegram = typeof body.value.telegram === "string" ? body.value.telegram.trim() : "";
  const workshop = typeof body.value.workshop === "string" ? body.value.workshop.trim() : "";
  const turnstileToken = typeof body.value["cf-turnstile-response"] === "string"
    ? body.value["cf-turnstile-response"]
    : "";

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
  const isTelegram = !telegram || /^@?[A-Za-z0-9_]{5,32}$/.test(telegram);

  if (
    name.length < 2 || name.length > 120 ||
    contact.length < 5 || contact.length > 200 || !isEmail ||
    !isTelegram
  ) {
    return NextResponse.json(
      { message: "Проверьте имя, email и формат Telegram username, если он указан." },
      { status: 400 },
    );
  }

  if (
    !isWorkshopId(workshop) ||
    (workshop !== "vibecoding-kg" && workshop !== "vibecoding")
  ) {
    return NextResponse.json({ message: "Регистрация доступна только на мастер-класс по вайбкодингу." }, { status: 400 });
  }

  const clientIp = getClientIp(request);
  const ipLimit = await consumeRateLimit({
    action: "registration_ip",
    identifiers: [clientIp],
    limit: 5,
    windowSeconds: 15 * 60,
  });

  if (!ipLimit) {
    return NextResponse.json(
      { message: "Регистрация временно недоступна. Попробуйте позже." },
      { status: 503 },
    );
  }

  if (!ipLimit.allowed) {
    return NextResponse.json(
      { message: "Слишком много попыток регистрации. Попробуйте позже." },
      { status: 429, headers: { "Retry-After": String(ipLimit.retryAfter) } },
    );
  }

  if (!turnstileToken || turnstileToken.length > 2_048) {
    return NextResponse.json({ message: "Подтвердите, что вы не робот." }, { status: 400 });
  }

  const turnstileIsValid = await verifyTurnstileToken(turnstileToken, clientIp);
  if (turnstileIsValid === null) {
    return NextResponse.json(
      { message: "Проверка безопасности временно недоступна. Попробуйте позже." },
      { status: 503 },
    );
  }
  if (!turnstileIsValid) {
    return NextResponse.json({ message: "Проверка безопасности не пройдена. Попробуйте ещё раз." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { message: "Регистрация пока не подключена. Добавьте переменные Supabase в Vercel." },
      { status: 503 },
    );
  }

  const telegramStartToken = randomBytes(24).toString("base64url");
  const telegramStartTokenHash = createHash("sha256").update(telegramStartToken).digest("hex");
  const guideAccessToken = randomBytes(32).toString("base64url");
  const guideAccessTokenHash = createHash("sha256").update(guideAccessToken).digest("hex");

  const { data, error } = await supabase.rpc("register_workshop_participant_secure_v2", {
    participant_name: name,
    participant_contact: contact,
    participant_telegram: telegram || null,
    participant_workshop: workshop,
    participant_source: "landing",
    participant_telegram_token_hash: telegramStartTokenHash,
    participant_guide_token_hash: guideAccessTokenHash,
  });

  if (error) {
    console.error("Supabase registration error:", error.code);

    if (["PGRST202", "PGRST204", "PGRST205"].includes(error.code)) {
      return NextResponse.json(
        { message: "Схема регистрации в Supabase не обновлена. Запустите supabase/schema.sql." },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { message: "Не удалось отправить заявку. Попробуйте ещё раз." },
      { status: 500 },
    );
  }

  const registration = data as { id?: unknown; status?: unknown; created?: unknown } | null;
  if (
    !registration ||
    typeof registration.id !== "string" ||
    !["new", "confirmed", "next_run"].includes(String(registration.status)) ||
    typeof registration.created !== "boolean"
  ) {
    console.error("Supabase registration returned an invalid result");
    return NextResponse.json({ message: "Не удалось отправить заявку. Попробуйте ещё раз." }, { status: 500 });
  }

  let registrationStatus: RegistrationStatus = registration.status === "next_run" ? "next_run" : "new";
  if (registration.created && !workshops[workshop].registrationOpen && registrationStatus !== "next_run") {
    const now = new Date().toISOString();
    const { error: waitlistUpdateError } = await supabase
      .from("workshop_registrations")
      .update({ status: "next_run", updated_at: now })
      .eq("id", registration.id);

    if (waitlistUpdateError) {
      console.error("Registration waitlist update error:", waitlistUpdateError.code);
      return NextResponse.json(
        { message: "Не удалось добавить заявку в waitlist. Попробуйте ещё раз." },
        { status: 500 },
      );
    }
    registrationStatus = "next_run";
  }
  const isNextRun = registrationStatus === "next_run";
  const guideUrl = registration.created && !isNextRun
    ? getGuideAccessUrl(guideAccessToken, request.url) ?? undefined
    : undefined;

  const deliveryResults = registration.created
    ? await Promise.allSettled([
        notifyAdminAboutRegistration({ name, email: contact, telegram, workshop, registrationStatus }),
        sendWelcomeEmail({ name, email: contact, workshop, registrationStatus, guideUrl }),
      ])
    : [];

  for (const result of deliveryResults) {
    if (result.status === "rejected") {
      console.error("Registration notification error:", result.reason);
    }
  }

  const emailWasSent = deliveryResults[1]?.status === "fulfilled";
  if (emailWasSent && guideUrl) {
    const now = new Date().toISOString();
    const { error: instructionsUpdateError } = await supabase
      .from("workshop_registrations")
      .update({ instructions_status: "sent", instructions_sent_at: now, updated_at: now })
      .eq("id", registration.id);
    if (instructionsUpdateError) {
      console.error("Registration instructions status error:", instructionsUpdateError.code);
    }
  }

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.replace(/^@/, "");
  const telegramBotUrl = botUsername && registration.created
    ? `https://t.me/${botUsername}?start=${telegramStartToken}`
    : undefined;

  return NextResponse.json({
    message: !registration.created
      ? isNextRun
        ? "Вы уже записаны на следующий набор. Мы сообщим о новой дате."
        : "Вы уже зарегистрированы. Проверьте письмо с подтверждением."
      : isNextRun
      ? emailWasSent
        ? "Места закончились — вы записаны на следующий набор. Подтверждение отправлено на email."
        : "Места закончились — вы записаны на следующий набор. Мы свяжемся с вами лично."
      : emailWasSent
        ? "Вы в списке! Приветственное письмо отправлено на email."
        : "Вы в списке! Письмо пока не отправилось — мы свяжемся с вами лично.",
    telegramBotUrl,
    registrationStatus,
  }, { headers: { "Cache-Control": "no-store" } });
}
