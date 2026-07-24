import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { CRM_SESSION_COOKIE, isCrmConfigured, verifyCrmSession } from "@/lib/crm-auth";
import { participantSelect, type Participant } from "@/lib/crm";
import { createSupabaseAdmin } from "@/lib/supabase";
import CrmDashboard from "./CrmDashboard";
import styles from "./crm.module.css";

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  const cookieStore = await cookies();
  if (!verifyCrmSession(cookieStore.get(CRM_SESSION_COOKIE)?.value)) redirect("/crm/login");

  const supabase = createSupabaseAdmin();
  let participants: Participant[] = [];
  let loadError = "";

  if (!supabase) {
    loadError = "Supabase не настроен. Добавьте URL и service role key в переменные окружения.";
  } else {
    const { data, error } = await supabase
      .from("workshop_registrations")
      .select(participantSelect)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("CRM participants load error:", error.code);
      loadError = "Не удалось загрузить участников. Примените актуальный supabase/schema.sql.";
    } else {
      participants = (data ?? []) as unknown as Participant[];
    }
  }

  return (
    <main className={styles.crmPage}>
      <header className={styles.topbar}>
        <a className={styles.crmBrand} href="/"><span>✦</span> Мастерская <em>/ CRM</em></a>
        <form action="/api/crm/logout" method="post"><button type="submit"><LogOut size={15} /> Выйти</button></form>
      </header>
      <div className={styles.crmContainer}>
        <div className={styles.pageHeading}>
          <div><p className={styles.kicker}>Управление мастер-классом</p><h1>Участники</h1></div>
          <p>Оплаты, коммуникация и готовность — в одном месте.</p>
        </div>
        {!isCrmConfigured() ? <div className={styles.alert}>Добавьте CRM_USERNAME, CRM_PASSWORD_HASH и CRM_SESSION_SECRET (не короче 32 символов).</div> : null}
        {loadError ? <div className={styles.alert}>{loadError}</div> : <CrmDashboard participants={participants} />}
      </div>
    </main>
  );
}
