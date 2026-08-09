import { createHash } from "crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { isPaymentReceiptToken } from "@/lib/payment-receipts";
import { createSupabaseAdmin } from "@/lib/supabase";
import ReceiptUploadForm from "./ReceiptUploadForm";
import styles from "../receipt.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Загрузка чека — Мастерская",
  robots: { index: false, follow: false },
};

export default async function PaymentReceiptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createSupabaseAdmin();
  let participantName = "";

  if (supabase && isPaymentReceiptToken(token)) {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const { data } = await supabase
      .from("workshop_registrations")
      .select("name,status")
      .eq("payment_receipt_upload_token_hash", tokenHash)
      .maybeSingle();
    if (data && data.status !== "cancelled") participantName = data.name;
  }

  return (
    <main className={styles.page}>
      <Link className={styles.back} href="/"><ArrowLeft size={16} /> На главную</Link>
      <section className={styles.card}>
        <div className={styles.icon}><LockKeyhole size={27} /></div>
        <p className={styles.kicker}>Безопасная загрузка</p>
        <h1>Загрузите<br /><em>чек оплаты.</em></h1>
        {participantName ? (
          <>
            <p className={styles.lead}>{participantName}, прикрепите фотографию или PDF чека. Ссылка одноразовая.</p>
            <ReceiptUploadForm token={token} />
          </>
        ) : (
          <div className={styles.invalid}>Эта ссылка недействительна или уже была использована. Попросите организатора отправить новую.</div>
        )}
      </section>
    </main>
  );
}
