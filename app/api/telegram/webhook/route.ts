import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { copyTelegramMessage, participantWelcomeText, sendTelegramMessage } from "@/lib/telegram";
import { isWorkshopId, workshops } from "@/lib/workshops";
import { readJsonBody } from "@/lib/request-security";

type TelegramUpdate = {
  message?: {
    message_id?: number;
    text?: string;
    photo?: Array<{ file_id?: string }>;
    document?: { file_id?: string };
    chat?: { id?: number };
  };
};

export async function POST(request: Request) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const receivedSecret = request.headers.get("x-telegram-bot-api-secret-token");

  if (!expectedSecret || receivedSecret !== expectedSecret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await readJsonBody<TelegramUpdate>(request, 64 * 1_024);
  if (!body.ok) {
    return NextResponse.json({ ok: true });
  }
  const update = body.value;

  const text = update.message?.text?.trim() || "";
  const chatId = update.message?.chat?.id;
  const messageId = update.message?.message_id;
  const hasReceipt = Boolean(update.message?.photo?.length || update.message?.document?.file_id);
  const match = text.match(/^\/start(?:@\w+)?\s+([A-Za-z0-9_-]+)$/);

  if (!chatId) return NextResponse.json({ ok: true });

  if (hasReceipt && messageId) {
    const supabase = createSupabaseAdmin();
    if (!supabase) return NextResponse.json({ ok: false }, { status: 503 });

    const { data: participant, error } = await supabase
      .from("workshop_registrations")
      .select("id,name,contact,workshop")
      .eq("telegram_chat_id", chatId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Telegram receipt participant lookup error:", error.code);
      return NextResponse.json({ ok: false }, { status: 500 });
    }
    if (!participant || !isWorkshopId(participant.workshop)) {
      await sendTelegramMessage(chatId, "Сначала подключите бота по персональной ссылке из письма об оплате.");
      return NextResponse.json({ ok: true });
    }

    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
    if (!adminChatId) return NextResponse.json({ ok: false }, { status: 503 });

    try {
      await sendTelegramMessage(adminChatId, [
        "Чек об оплате 🧾",
        `Участник: ${participant.name}`,
        `Email: ${participant.contact}`,
        `Мастер-класс: ${workshops[participant.workshop].title}`,
        "Проверьте чек и нажмите «Подтвердить оплату и место» в CRM.",
      ].join("\n"));
      await copyTelegramMessage(adminChatId, chatId, messageId);
      await sendTelegramMessage(chatId, "Чек получен ✅ После проверки мы пришлём подтверждение оплаты и личную инструкцию на email.");
    } catch (receiptError) {
      console.error("Telegram receipt forwarding error:", receiptError instanceof Error ? receiptError.message : "Unknown error");
      return NextResponse.json({ ok: false }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  }

  if (!match) {
    if (chatId && text.startsWith("/start")) {
      await sendTelegramMessage(chatId, "Сначала зарегистрируйтесь на сайте, затем откройте персональную ссылку Telegram.");
    } else if (text) {
      await sendTelegramMessage(chatId, "Чтобы подтвердить оплату, отправьте чек как фотографию или файл.");
    }
    return NextResponse.json({ ok: true });
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 503 });

  const tokenHash = createHash("sha256").update(match[1]).digest("hex");
  const { data, error } = await supabase
    .rpc("claim_telegram_registration", {
      participant_token_hash: tokenHash,
      participant_chat_id: chatId,
    })
    .maybeSingle();

  if (error) {
    console.error("Telegram registration lookup error:", error.code);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const registration = data as { name?: unknown; workshop?: unknown; status?: unknown } | null;
  if (
    !registration ||
    typeof registration.name !== "string" ||
    typeof registration.workshop !== "string" ||
    !isWorkshopId(registration.workshop)
  ) {
    await sendTelegramMessage(chatId, "Ссылка недействительна или уже была использована.");
    return NextResponse.json({ ok: true });
  }

  const registrationStatus = registration.status === "next_run" ? "next_run" : "new";
  await sendTelegramMessage(
    chatId,
    participantWelcomeText(registration.name, registration.workshop, registrationStatus),
  );

  return NextResponse.json({ ok: true });
}
