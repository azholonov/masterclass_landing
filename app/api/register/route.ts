import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { createSupabaseAdmin } from "@/lib/supabase";
import { sendWelcomeEmail } from "@/lib/email";
import { notifyAdminAboutRegistration } from "@/lib/telegram";
import { isWorkshopId } from "@/lib/workshops";

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

  if (!isWorkshopId(workshop)) {
    return NextResponse.json({ message: "Выберите мастер-класс." }, { status: 400 });
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

  const { error } = await supabase.from("workshop_registrations").insert({
    name,
    contact,
    telegram: telegram || null,
    workshop,
    source: "landing",
    telegram_start_token_hash: telegramStartTokenHash,
  });

  if (error) {
    console.error("Supabase registration error:", error.code);

    if (["PGRST204", "PGRST205"].includes(error.code)) {
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

  const deliveryResults = await Promise.allSettled([
    notifyAdminAboutRegistration({ name, email: contact, telegram, workshop }),
    sendWelcomeEmail({ name, email: contact, workshop }),
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
    message: emailWasSent
      ? "Вы в списке! Приветственное письмо отправлено на email."
      : "Вы в списке! Письмо пока не отправилось — мы свяжемся с вами лично.",
    telegramBotUrl,
  });
}
