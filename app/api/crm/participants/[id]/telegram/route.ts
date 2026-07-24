import { NextRequest, NextResponse } from "next/server";
import { CRM_SESSION_COOKIE, verifyCrmSession } from "@/lib/crm-auth";
import { telegramMessageTypes } from "@/lib/crm";
import { createSupabaseAdmin } from "@/lib/supabase";
import { sendTelegramMessage } from "@/lib/telegram";
import { readJsonBody } from "@/lib/request-security";

type MessagePayload = {
  messageType?: unknown;
  text?: unknown;
};

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!verifyCrmSession(request.cookies.get(CRM_SESSION_COOKIE)?.value)) {
    return NextResponse.json({ message: "Сессия истекла. Войдите снова." }, { status: 401 });
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ message: "Запрос отклонён." }, { status: 403 });
  }

  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)) {
    return NextResponse.json({ message: "Некорректный ID." }, { status: 400 });
  }

  const body = await readJsonBody<MessagePayload>(request, 8 * 1_024);
  if (!body.ok) {
    return NextResponse.json(
      { message: body.reason === "too_large" ? "Данные слишком большие." : "Некорректные данные." },
      { status: body.reason === "too_large" ? 413 : 400 },
    );
  }
  const payload = body.value;

  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  const messageType = typeof payload.messageType === "string" ? payload.messageType : "";
  if (!telegramMessageTypes.includes(messageType as (typeof telegramMessageTypes)[number])) {
    return NextResponse.json({ message: "Выберите тип сообщения." }, { status: 400 });
  }
  if (!text || text.length > 4000) {
    return NextResponse.json({ message: "Сообщение должно содержать от 1 до 4000 символов." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ message: "Supabase не настроен." }, { status: 503 });
  }

  const { data: participant, error: participantError } = await supabase
    .from("workshop_registrations")
    .select("id,name,telegram_chat_id")
    .eq("id", id)
    .maybeSingle();

  if (participantError || !participant) {
    return NextResponse.json({ message: "Участник не найден." }, { status: 404 });
  }
  if (!participant.telegram_chat_id) {
    return NextResponse.json(
      { message: "Участник ещё не подключил Telegram-бота." },
      { status: 409 },
    );
  }

  const { data: messageLog, error: logError } = await supabase
    .from("crm_telegram_messages")
    .insert({ participant_id: id, message_type: messageType, body: text })
    .select("id")
    .single();

  if (logError || !messageLog) {
    console.error("CRM Telegram message log error:", logError?.code);
    return NextResponse.json(
      { message: "Журнал сообщений не настроен. Примените актуальный supabase/schema.sql." },
      { status: 503 },
    );
  }

  try {
    const result = await sendTelegramMessage(participant.telegram_chat_id, text);
    const sentAt = new Date().toISOString();

    const { error: deliveryLogError } = await supabase
      .from("crm_telegram_messages")
      .update({
        delivery_status: "sent",
        telegram_message_id: result.messageId,
        delivered_at: sentAt,
      })
      .eq("id", messageLog.id);

    if (deliveryLogError) console.error("CRM Telegram delivery log error:", deliveryLogError.code);

    const { error: participantUpdateError } = await supabase
      .from("workshop_registrations")
      .update({
        last_telegram_sent_at: sentAt,
        last_telegram_message_type: messageType,
        updated_at: sentAt,
      })
      .eq("id", id);

    if (participantUpdateError) console.error("CRM Telegram participant update error:", participantUpdateError.code);

    return NextResponse.json({ ok: true, sentAt }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message.slice(0, 500) : "Unknown Telegram error";
    const { error: failureLogError } = await supabase
      .from("crm_telegram_messages")
      .update({ delivery_status: "failed", error_message: errorMessage })
      .eq("id", messageLog.id);

    if (failureLogError) console.error("CRM Telegram failure log error:", failureLogError.code);
    console.error("CRM Telegram send error:", errorMessage);
    return NextResponse.json(
      { message: "Telegram не доставил сообщение. Возможно, участник заблокировал бота." },
      { status: 502 },
    );
  }
}
