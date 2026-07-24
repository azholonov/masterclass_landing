import { NextRequest, NextResponse } from "next/server";
import { CRM_SESSION_COOKIE, verifyCrmSession } from "@/lib/crm-auth";
import {
  attendanceStatuses,
  contactStatuses,
  instructionsStatuses,
  paymentStatuses,
  registrationStatuses,
} from "@/lib/crm";
import { createSupabaseAdmin } from "@/lib/supabase";
import { readJsonBody } from "@/lib/request-security";

type UpdatePayload = {
  status?: unknown;
  payment_status?: unknown;
  payment_amount?: unknown;
  instructions_status?: unknown;
  contact_status?: unknown;
  attendance_status?: unknown;
  next_action?: unknown;
  notes?: unknown;
};

function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === "string" && values.includes(value as T);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
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

  const body = await readJsonBody<UpdatePayload>(request, 8 * 1_024);
  if (!body.ok) {
    return NextResponse.json(
      { message: body.reason === "too_large" ? "Данные слишком большие." : "Некорректные данные." },
      { status: body.reason === "too_large" ? 413 : 400 },
    );
  }
  const payload = body.value;

  if (
    !isOneOf(payload.status, registrationStatuses) ||
    !isOneOf(payload.payment_status, paymentStatuses) ||
    !isOneOf(payload.instructions_status, instructionsStatuses) ||
    !isOneOf(payload.contact_status, contactStatuses) ||
    !isOneOf(payload.attendance_status, attendanceStatuses)
  ) {
    return NextResponse.json({ message: "Некорректный статус." }, { status: 400 });
  }

  const paymentAmount = Number(payload.payment_amount);
  const nextAction = typeof payload.next_action === "string" ? payload.next_action.trim() : "";
  const notes = typeof payload.notes === "string" ? payload.notes.trim() : "";
  if (!Number.isInteger(paymentAmount) || paymentAmount < 0 || paymentAmount > 1_000_000) {
    return NextResponse.json({ message: "Некорректная сумма оплаты." }, { status: 400 });
  }
  if (nextAction.length > 500 || notes.length > 5000) {
    return NextResponse.json({ message: "Текст слишком длинный." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ message: "Supabase не настроен." }, { status: 503 });
  }

  const { data: existing, error: readError } = await supabase
    .from("workshop_registrations")
    .select("paid_at,instructions_sent_at,last_contacted_at")
    .eq("id", id)
    .maybeSingle();

  if (readError || !existing) {
    return NextResponse.json({ message: "Участник не найден." }, { status: 404 });
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("workshop_registrations")
    .update({
      status: payload.status,
      payment_status: payload.payment_status,
      payment_amount: paymentAmount,
      paid_at: payload.payment_status === "paid" ? existing.paid_at ?? now : existing.paid_at,
      instructions_status: payload.instructions_status,
      instructions_sent_at:
        payload.instructions_status !== "not_sent" ? existing.instructions_sent_at ?? now : existing.instructions_sent_at,
      contact_status: payload.contact_status,
      last_contacted_at:
        payload.contact_status !== "not_contacted" ? existing.last_contacted_at ?? now : existing.last_contacted_at,
      attendance_status: payload.attendance_status,
      next_action: nextAction,
      notes,
      updated_at: now,
    })
    .eq("id", id);

  if (error) {
    console.error("CRM participant update error:", error.code);
    return NextResponse.json({ message: "Не удалось сохранить изменения." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updated_at: now });
}
