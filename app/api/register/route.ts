import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { createSupabaseAdmin } from "@/lib/supabase";
import { sendWelcomeEmail } from "@/lib/email";
import { notifyAdminAboutRegistration } from "@/lib/telegram";
import { isWorkshopId, type RegistrationStatus } from "@/lib/workshops";

type RegistrationPayload = {
  name?: unknown;
  contact?: unknown;
  telegram?: unknown;
  workshop?: unknown;
};

export async function POST(request: Request) {
  let payload: RegistrationPayload;

  try {
    payload = (await request.json()) as RegistrationPayload;
  } catch {
    return NextResponse.json({ message: "Некорректные данные формы." }, { status: 400 });
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const contact = typeof payload.contact === "string" ? payload.contact.trim() : "";
  const telegram = typeof payload.telegram === "string" ? payload.telegram.trim() : "";
  const workshop = typeof payload.workshop === "string" ? payload.workshop.trim() : "";

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);

  if (name.length < 2 || !isEmail) {
    return NextResponse.json(
      { message: "Проверьте имя и email." },
      { status: 400 },
    );
  }

  if (!isWorkshopId(workshop) || workshop !== "vibecoding") {
    return NextResponse.json({ message: "Регистрация доступна только на мастер-класс по вайбкодингу." }, { status: 400 });
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

  const { data, error } = await supabase.rpc("register_workshop_participant", {
    participant_name: name,
    participant_contact: contact,
    participant_telegram: telegram || null,
    participant_workshop: workshop,
    participant_source: "landing",
    participant_telegram_token_hash: telegramStartTokenHash,
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

  const registrationStatus = data as RegistrationStatus;
  const isNextRun = registrationStatus === "next_run";

  const deliveryResults = await Promise.allSettled([
    notifyAdminAboutRegistration({ name, email: contact, telegram, workshop, registrationStatus }),
    sendWelcomeEmail({ name, email: contact, workshop, registrationStatus }),
  ]);

  for (const result of deliveryResults) {
    if (result.status === "rejected") {
      console.error("Registration notification error:", result.reason);
    }
  }

  const emailWasSent = deliveryResults[1].status === "fulfilled";

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.replace(/^@/, "");
  const telegramBotUrl = botUsername
    ? `https://t.me/${botUsername}?start=${telegramStartToken}`
    : undefined;

  return NextResponse.json({
    message: isNextRun
      ? emailWasSent
        ? "Места закончились — вы записаны на следующий набор. Подтверждение отправлено на email."
        : "Места закончились — вы записаны на следующий набор. Мы свяжемся с вами лично."
      : emailWasSent
        ? "Вы в списке! Приветственное письмо отправлено на email."
        : "Вы в списке! Письмо пока не отправилось — мы свяжемся с вами лично.",
    telegramBotUrl,
    registrationStatus,
  });
}
