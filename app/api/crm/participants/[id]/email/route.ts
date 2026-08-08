import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { CRM_SESSION_COOKIE, verifyCrmSession } from "@/lib/crm-auth";
import { sendCrmEmail, sendPaymentRequestEmail } from "@/lib/email";
import { readJsonBody } from "@/lib/request-security";
import { createSupabaseAdmin } from "@/lib/supabase";

type EmailPayload = {
  subject?: unknown;
  text?: unknown;
  template?: unknown;
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

  const body = await readJsonBody<EmailPayload>(request, 16 * 1_024);
  if (!body.ok) {
    return NextResponse.json(
      { message: body.reason === "too_large" ? "Данные слишком большие." : "Некорректные данные." },
      { status: body.reason === "too_large" ? 413 : 400 },
    );
  }

  const template = body.value.template === "payment_request" ? "payment_request" : null;
  const subject = typeof body.value.subject === "string" ? body.value.subject.trim() : "";
  const text = typeof body.value.text === "string" ? body.value.text.trim() : "";
  if (!template) {
    if (!subject || subject.length > 160 || /[\r\n]/.test(subject)) {
      return NextResponse.json({ message: "Тема должна содержать от 1 до 160 символов." }, { status: 400 });
    }
    if (!text || text.length > 10_000) {
      return NextResponse.json({ message: "Сообщение должно содержать от 1 до 10 000 символов." }, { status: 400 });
    }
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ message: "Supabase не настроен." }, { status: 503 });
  }

  const { data: participant, error: participantError } = await supabase
    .from("workshop_registrations")
    .select("id,name,contact,contact_status,telegram_chat_id")
    .eq("id", id)
    .maybeSingle();

  if (participantError || !participant) {
    return NextResponse.json({ message: "Участник не найден." }, { status: 404 });
  }

  try {
    if (template === "payment_request") {
      const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.replace(/^@/, "");
      if (!botUsername) {
        return NextResponse.json({ message: "Telegram-бот не настроен." }, { status: 503 });
      }

      let telegramBotUrl = `https://t.me/${botUsername}`;
      if (!participant.telegram_chat_id) {
        const telegramStartToken = randomBytes(32).toString("base64url");
        const tokenHash = createHash("sha256").update(telegramStartToken).digest("hex");
        const { error: tokenUpdateError } = await supabase
          .from("workshop_registrations")
          .update({ telegram_start_token_hash: tokenHash, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (tokenUpdateError) {
          console.error("CRM payment email Telegram token error:", tokenUpdateError.code);
          return NextResponse.json({ message: "Не удалось создать личную ссылку на Telegram-бот." }, { status: 503 });
        }
        telegramBotUrl += `?start=${telegramStartToken}`;
      }

      await sendPaymentRequestEmail({
        name: participant.name,
        email: participant.contact,
        telegramBotUrl,
      });
    } else {
      await sendCrmEmail({ name: participant.name, email: participant.contact, subject, text });
    }
    const sentAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("workshop_registrations")
      .update({
        contact_status: participant.contact_status === "not_contacted" ? "contacted" : participant.contact_status,
        last_contacted_at: sentAt,
        updated_at: sentAt,
      })
      .eq("id", id);

    if (updateError) console.error("CRM email contact update error:", updateError.code);
    return NextResponse.json({ ok: true, sentAt }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("CRM email send error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { message: "Письмо не отправилось. Проверьте настройки Gmail и попробуйте ещё раз." },
      { status: 502 },
    );
  }
}
