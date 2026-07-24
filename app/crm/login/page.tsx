import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CRM_SESSION_COOKIE, verifyCrmSession } from "@/lib/crm-auth";
import LoginForm from "./LoginForm";
import styles from "../crm.module.css";

export const dynamic = "force-dynamic";

export default async function CrmLoginPage() {
  const cookieStore = await cookies();
  if (verifyCrmSession(cookieStore.get(CRM_SESSION_COOKIE)?.value)) redirect("/crm");

  return (
    <main className={styles.loginPage}>
      <a className={styles.backLink} href="/">← На сайт</a>
      <LoginForm />
    </main>
  );
}
