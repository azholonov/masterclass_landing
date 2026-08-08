import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { CRM_SESSION_COOKIE, verifyCrmSession } from "@/lib/crm-auth";
import { sendGuideAccessEmail, sendPaymentConfirmationEmail } from "@/lib/email";
import { activeGuideStatuses, getGuideAccessUrl } from "@/lib/guide-auth";
import { readJsonBody } from "@/lib/request-security";
import { createSupabaseAdmin } from "@/lib/supabase";
import { isWorkshopId } from "@/lib/workshops";

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

  const body = await readJsonBody<{ emailType?: unknown }>(request, 1_024);
  if (!body.ok || !["guide_access", "payment_confirmation"].includes(String(body.value.emailType))) {
    return NextResponse.json({ message: "Некорректный тип письма." }, { status: 400 });
  }
  const isPaymentConfirmation = body.value.emailType === "payment_confirmation";

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ message: "Supabase не настроен." }, { status: 503 });
  }

  const { data: participant, error: participantError } = await supabase
    .from("workshop_registrations")
    .select("id,name,contact,workshop,status,instructions_sent_at,contact_status")
    .eq("id", id)
    .maybeSingle();

  if (participantError || !participant) {
    return NextResponse.json({ message: "Участник не найден." }, { status: 404 });
  }
  if (!isWorkshopId(participant.workshop)) {
    return NextResponse.json({ message: "Некорректный мастер-класс." }, { status: 409 });
  }
  const canIssueAccess = activeGuideStatuses.includes(
    participant.status as (typeof activeGuideStatuses)[number],
  );
  if ((!isPaymentConfirmation && !canIssueAccess) || participant.status === "cancelled") {
    return NextResponse.json({ message: "Доступ можно выдать только активному участнику." }, { status: 409 });
  }
  const isMobileWorkshop = participant.workshop === "vibecoding" || participant.workshop === "vibecoding-kg";
  if (isPaymentConfirmation && !isMobileWorkshop) {
    return NextResponse.json({ message: "Подтверждение оплаты настроено для мастер-класса по мобильному вайбкодингу." }, { status: 409 });
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const guideUrl = getGuideAccessUrl(token, request.url);
  if (!guideUrl) {
    return NextResponse.json({ message: "Настройте NEXT_PUBLIC_SITE_URL." }, { status: 503 });
  }

  const now = new Date().toISOString();
  const paymentAmount = isPaymentConfirmation ? 5_000 : 0;
  const { error: updateError } = await supabase
    .from("workshop_registrations")
    .update({
      guide_access_token_hash: tokenHash,
      ...(isPaymentConfirmation ? {
        status: "confirmed",
        payment_status: "paid",
        payment_amount: paymentAmount,
        paid_at: now,
        contact_status: participant.contact_status === "not_contacted" ? "contacted" : participant.contact_status,
        last_contacted_at: now,
      } : {}),
      instructions_status: "sent",
      instructions_sent_at: participant.instructions_sent_at ?? now,
      updated_at: now,
    })
    .eq("id", id);

  if (updateError) {
    console.error("CRM guide access update error:", updateError.code);
    return NextResponse.json(
      { message: "Не удалось создать ссылку. Примените актуальную схему Supabase." },
      { status: 503 },
    );
  }

  try {
    const emailInput = {
      name: participant.name,
      email: participant.contact,
      workshop: participant.workshop,
      guideUrl,
    };
    if (isPaymentConfirmation) {
      await sendPaymentConfirmationEmail(emailInput);
    } else {
      await sendGuideAccessEmail(emailInput);
    }
    return NextResponse.json({ ok: true, emailed: true, guideUrl, sentAt: now, paymentAmount }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("CRM guide access email error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({
      ok: true,
      emailed: false,
      guideUrl,
      sentAt: now,
      message: "Ссылка создана, но письмо не отправилось. Скопируйте ссылку вручную.",
    }, { headers: { "Cache-Control": "no-store" } });
  }
}
