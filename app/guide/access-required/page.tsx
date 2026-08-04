import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, LockKeyhole, Mail } from "lucide-react";
import styles from "../guide.module.css";

export const metadata: Metadata = {
  title: "Доступ к инструкции — Мастерская",
  robots: { index: false, follow: false },
};

export default async function GuideAccessRequiredPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const message = reason === "invalid"
    ? "Эта ссылка недействительна, отключена или регистрация больше не активна. Попросите организатора отправить новую."
    : reason === "unavailable"
      ? "Доступ временно не настроен. Организатору нужно проверить конфигурацию сайта."
      : "Откройте персональную ссылку из письма после регистрации.";

  return (
    <main className={styles.accessPage}>
      <Link className={styles.accessBack} href="/"><ArrowLeft size={16} /> На главную</Link>
      <section className={styles.accessCard}>
        <div className={styles.accessIcon}><LockKeyhole size={27} /></div>
        <p className={styles.kicker}>Закрытый раздел</p>
        <h1>ИНСТРУКЦИЯ<br /><em>ДЛЯ УЧАСТНИКОВ.</em></h1>
        <p className={styles.accessLead}>{message}</p>
        <div className={styles.accessSteps}>
          <div><Mail size={18} /><span><strong>Участник</strong>Найдите письмо «Личная инструкция» или напишите организатору.</span></div>
        </div>
        <div className={styles.accessActions}>
          <a className={styles.accessPrimaryAction} href="mailto:soloapps.dev@gmail.com">Запросить новую ссылку</a>
        </div>
      </section>
    </main>
  );
}
