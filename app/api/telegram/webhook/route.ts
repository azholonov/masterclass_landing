import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { participantWelcomeText, sendTelegramMessage } from "@/lib/telegram";
import { isWorkshopId } from "@/lib/workshops";
import { readJsonBody } from "@/lib/request-security";

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

  const body = await readJsonBody<TelegramUpdate>(request, 64 * 1_024);
  if (!body.ok) {
    return NextResponse.json({ ok: true });
  }
  const update = body.value;

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
