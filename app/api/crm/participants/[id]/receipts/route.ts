import { NextRequest, NextResponse } from "next/server";
import { CRM_SESSION_COOKIE, verifyCrmSession } from "@/lib/crm-auth";
import { PAYMENT_RECEIPT_BUCKET } from "@/lib/payment-receipts";
import { createSupabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!verifyCrmSession(request.cookies.get(CRM_SESSION_COOKIE)?.value)) {
    return NextResponse.json({ message: "Сессия истекла. Войдите снова." }, { status: 401 });
  }

  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)) {
    return NextResponse.json({ message: "Некорректный ID." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ message: "Supabase не настроен." }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("payment_receipts")
    .select("id,created_at,storage_path,original_filename,content_type,file_size,review_status")
    .eq("participant_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("CRM receipt list error:", error.code);
    return NextResponse.json({ message: "Не удалось загрузить чеки. Примените актуальную схему Supabase." }, { status: 503 });
  }

  const receipts = await Promise.all((data ?? []).map(async (receipt) => {
    const { data: signed, error: signedError } = await supabase.storage
      .from(PAYMENT_RECEIPT_BUCKET)
      .createSignedUrl(receipt.storage_path, 10 * 60);
    return {
      id: receipt.id,
      createdAt: receipt.created_at,
      filename: receipt.original_filename,
      contentType: receipt.content_type,
      fileSize: receipt.file_size,
      reviewStatus: receipt.review_status,
      url: signedError ? null : signed.signedUrl,
    };
  }));

  return NextResponse.json({ receipts }, { headers: { "Cache-Control": "no-store" } });
}
