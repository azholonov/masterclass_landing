import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";

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

  if (name.length < 2 || contact.length < 5) {
    return NextResponse.json(
      { message: "Проверьте имя и контакт для связи." },
      { status: 400 },
    );
  }

  if (!["vibecoding", "token-economics"].includes(workshop)) {
    return NextResponse.json({ message: "Выберите мастер-класс." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { message: "Регистрация пока не подключена. Добавьте переменные Supabase в Vercel." },
      { status: 503 },
    );
  }

  const { error } = await supabase.from("workshop_registrations").insert({
    name,
    contact,
    telegram: telegram || null,
    workshop,
    source: "landing",
  });

  if (error) {
    console.error("Supabase registration error:", error.code);
    return NextResponse.json(
      { message: "Не удалось отправить заявку. Попробуйте ещё раз." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: "Вы в списке! Детали мастер-класса отправим вам лично.",
  });
}
