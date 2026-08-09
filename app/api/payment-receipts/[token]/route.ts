import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  extensionForPaymentReceipt,
  hashPaymentReceiptToken,
  isPaymentReceiptToken,
  matchesPaymentReceiptSignature,
  PAYMENT_RECEIPT_BUCKET,
  PAYMENT_RECEIPT_MAX_BYTES,
  paymentReceiptMimeTypes,
} from "@/lib/payment-receipts";
import { createSupabaseAdmin } from "@/lib/supabase";
import { sendTelegramMessage } from "@/lib/telegram";
import { isWorkshopId, workshops } from "@/lib/workshops";

export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ message: "Запрос отклонён." }, { status: 403 });
  }

  const { token } = await context.params;
  if (!isPaymentReceiptToken(token)) {
    return NextResponse.json({ message: "Ссылка недействительна или уже использована." }, { status: 404 });
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ message: "Загрузка временно недоступна." }, { status: 503 });
  }

  const tokenHash = hashPaymentReceiptToken(token);
  const { data: participant, error: participantError } = await supabase
    .from("workshop_registrations")
    .select("id,name,contact,workshop,status")
    .eq("payment_receipt_upload_token_hash", tokenHash)
    .maybeSingle();

  if (participantError || !participant || participant.status === "cancelled" || !isWorkshopId(participant.workshop)) {
    return NextResponse.json({ message: "Ссылка недействительна или уже использована." }, { status: 404 });
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > PAYMENT_RECEIPT_MAX_BYTES + 512 * 1024) {
    return NextResponse.json({ message: "Файл слишком большой. Максимум — 3 МБ." }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ message: "Не удалось прочитать файл." }, { status: 400 });
  }

  const receipt = formData.get("receipt");
  if (!(receipt instanceof File) || receipt.size === 0) {
    return NextResponse.json({ message: "Выберите фотографию или PDF-файл чека." }, { status: 400 });
  }
  if (receipt.size > PAYMENT_RECEIPT_MAX_BYTES) {
    return NextResponse.json({ message: "Файл слишком большой. Максимум — 3 МБ." }, { status: 413 });
  }
  if (!paymentReceiptMimeTypes.includes(receipt.type as (typeof paymentReceiptMimeTypes)[number])) {
    return NextResponse.json({ message: "Разрешены JPG, PNG, WEBP и PDF." }, { status: 415 });
  }

  const extension = extensionForPaymentReceipt(receipt.type);
  if (!extension) {
    return NextResponse.json({ message: "Неподдерживаемый формат файла." }, { status: 415 });
  }

  const bytes = Buffer.from(await receipt.arrayBuffer());
  if (!matchesPaymentReceiptSignature(bytes, receipt.type)) {
    return NextResponse.json({ message: "Содержимое файла не соответствует выбранному формату." }, { status: 415 });
  }

  const storagePath = `${participant.id}/${randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(PAYMENT_RECEIPT_BUCKET)
    .upload(storagePath, bytes, { contentType: receipt.type, upsert: false });

  if (uploadError) {
    console.error("Payment receipt storage error:", uploadError.message);
    return NextResponse.json({ message: "Не удалось сохранить файл. Попробуйте ещё раз." }, { status: 503 });
  }

  const originalFilename = receipt.name.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 180) || `receipt.${extension}`;
  const { error: insertError } = await supabase.from("payment_receipts").insert({
    participant_id: participant.id,
    storage_path: storagePath,
    original_filename: originalFilename,
    content_type: receipt.type,
    file_size: receipt.size,
  });

  if (insertError) {
    console.error("Payment receipt database error:", insertError.code);
    await supabase.storage.from(PAYMENT_RECEIPT_BUCKET).remove([storagePath]);
    return NextResponse.json({ message: "Не удалось зарегистрировать чек. Попробуйте ещё раз." }, { status: 503 });
  }

  const now = new Date().toISOString();
  const { error: consumeError } = await supabase
    .from("workshop_registrations")
    .update({ payment_receipt_upload_token_hash: null, updated_at: now })
    .eq("id", participant.id)
    .eq("payment_receipt_upload_token_hash", tokenHash);
  if (consumeError) console.error("Payment receipt token consume error:", consumeError.code);

  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (adminChatId) {
    try {
      await sendTelegramMessage(adminChatId, [
        "Новый чек загружен на сайте 🧾",
        `Участник: ${participant.name}`,
        `Email: ${participant.contact}`,
        `Мастер-класс: ${workshops[participant.workshop].title}`,
        `Откройте CRM для проверки: ${request.nextUrl.origin}/crm`,
      ].join("\n"));
    } catch (notificationError) {
      console.error("Payment receipt notification error:", notificationError instanceof Error ? notificationError.message : "Unknown error");
    }
  }

  return NextResponse.json({ ok: true, message: "Чек загружен. После проверки мы пришлём подтверждение на email." }, {
    headers: { "Cache-Control": "no-store" },
  });
}
