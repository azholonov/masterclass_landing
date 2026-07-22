import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { participantWelcomeText, sendTelegramMessage } from "@/lib/telegram";
import { isWorkshopId } from "@/lib/workshops";

type TelegramUpdate = {
  message?: {
    text?: string;
    chat?: { id?: number };
  };
};

export async function POST(request: Request) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const receivedSecret = request.headers.get("x-telegram-bot-api-secret-token");

  if (!expectedSecret || receivedSecret !== expectedSecret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const text = update.message?.text?.trim() || "";
  const chatId = update.message?.chat?.id;
  const match = text.match(/^\/start(?:@\w+)?\s+([A-Za-z0-9_-]+)$/);

  if (!chatId || !match) {
    if (chatId && text.startsWith("/start")) {
      await sendTelegramMessage(chatId, "Сначала зарегистрируйтесь на сайте, затем откройте персональную ссылку Telegram.");
    }
    return NextResponse.json({ ok: true });
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 503 });

  const tokenHash = createHash("sha256").update(match[1]).digest("hex");
  const { data, error } = await supabase
    .from("workshop_registrations")
    .select("id, name, workshop, status")
    .eq("telegram_start_token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    console.error("Telegram registration lookup error:", error.code);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  if (!data || !isWorkshopId(data.workshop)) {
    await sendTelegramMessage(chatId, "Ссылка недействительна или уже была использована.");
    return NextResponse.json({ ok: true });
  }

  const registrationStatus = data.status === "next_run" ? "next_run" : "new";
  await sendTelegramMessage(chatId, participantWelcomeText(data.name, data.workshop, registrationStatus));

  const { error: updateError } = await supabase
    .from("workshop_registrations")
    .update({ telegram_chat_id: chatId, telegram_start_token_hash: null })
    .eq("id", data.id);

  if (updateError) console.error("Telegram chat ID update error:", updateError.code);

  return NextResponse.json({ ok: true });
}
