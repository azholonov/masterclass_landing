import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { CRM_SESSION_COOKIE, verifyCrmSession } from "@/lib/crm-auth";
import { sendGuideAccessEmail } from "@/lib/email";
import { activeGuideStatuses, getGuideAccessUrl } from "@/lib/guide-auth";
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

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ message: "Supabase не настроен." }, { status: 503 });
  }

  const { data: participant, error: participantError } = await supabase
    .from("workshop_registrations")
    .select("id,name,contact,workshop,status,instructions_sent_at")
    .eq("id", id)
    .maybeSingle();

  if (participantError || !participant) {
    return NextResponse.json({ message: "Участник не найден." }, { status: 404 });
  }
  if (
    !activeGuideStatuses.includes(participant.status as (typeof activeGuideStatuses)[number]) ||
    !isWorkshopId(participant.workshop)
  ) {
    return NextResponse.json({ message: "Доступ можно выдать только активному участнику." }, { status: 409 });
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const guideUrl = getGuideAccessUrl(token, request.url);
  if (!guideUrl) {
    return NextResponse.json({ message: "Настройте NEXT_PUBLIC_SITE_URL." }, { status: 503 });
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("workshop_registrations")
    .update({
      guide_access_token_hash: tokenHash,
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
    await sendGuideAccessEmail({
      name: participant.name,
      email: participant.contact,
      workshop: participant.workshop,
      guideUrl,
    });
    return NextResponse.json({ ok: true, emailed: true, guideUrl, sentAt: now }, {
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
