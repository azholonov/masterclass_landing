import { NextRequest, NextResponse } from "next/server";
import {
  activeGuideStatuses,
  GUIDE_SESSION_COOKIE,
  verifyGuideSession,
} from "@/lib/guide-auth";
import { isGuideChecklistItemId } from "@/lib/guide-progress";
import { readJsonBody } from "@/lib/request-security";
import { createSupabaseAdmin } from "@/lib/supabase";

type ProgressPayload = { completedItems?: unknown };

export async function PATCH(request: NextRequest) {
  const guideSession = verifyGuideSession(request.cookies.get(GUIDE_SESSION_COOKIE)?.value);
  if (!guideSession) {
    return NextResponse.json({ message: "Сессия истекла. Откройте личную ссылку ещё раз." }, { status: 401 });
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ message: "Запрос отклонён." }, { status: 403 });
  }

  const body = await readJsonBody<ProgressPayload>(request, 2_048);
  if (!body.ok) {
    return NextResponse.json({ message: "Некорректный прогресс." }, { status: 400 });
  }

  if (
    !Array.isArray(body.value.completedItems) ||
    body.value.completedItems.length > 8 ||
    !body.value.completedItems.every(isGuideChecklistItemId)
  ) {
    return NextResponse.json({ message: "Некорректный прогресс." }, { status: 400 });
  }

  const completedItems = [...new Set(body.value.completedItems)];
  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ message: "Сохранение временно недоступно." }, { status: 503 });
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("workshop_registrations")
    .update({ guide_completed_items: completedItems, guide_progress_updated_at: now })
    .eq("id", guideSession.participantId)
    .eq("guide_access_token_hash", guideSession.accessTokenHash)
    .in("status", [...activeGuideStatuses])
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Guide progress update error:", error.code);
    return NextResponse.json(
      { message: "Не удалось сохранить. Примените актуальную схему Supabase." },
      { status: 503 },
    );
  }
  if (!data) {
    return NextResponse.json({ message: "Доступ к инструкции закрыт." }, { status: 403 });
  }

  return NextResponse.json({ ok: true, completedItems, updatedAt: now }, {
    headers: { "Cache-Control": "no-store" },
  });
}
