"use client";

import { useMemo, useState } from "react";
import {
  Banknote, Check, CircleAlert, LoaderCircle, Mail, MessageCircle,
  Save, Search, Send, UserCheck, Users,
} from "lucide-react";
import type { Participant } from "@/lib/crm";
import styles from "./crm.module.css";

const labels = {
  registration: { new: "Новая", confirmed: "Подтверждён", cancelled: "Отменён", next_run: "Следующий набор" },
  payment: { unpaid: "Не оплачено", partial: "Частично", paid: "Оплачено", refunded: "Возврат" },
  instructions: { not_sent: "Не отправлены", sent: "Отправлены", acknowledged: "Подтверждены" },
  contact: { not_contacted: "Не связывались", contacted: "Связались", replied: "Ответил(а)" },
  attendance: { pending: "Ожидается", attended: "Пришёл/пришла", no_show: "Не пришёл/пришла" },
} as const;

type Filter = "all" | "unpaid" | "instructions" | "contact" | "confirmed";

function ParticipantCard({ participant }: { participant: Participant }) {
  const [draft, setDraft] = useState(participant);
  const [saved, setSaved] = useState(participant);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const isDirty = JSON.stringify(draft) !== JSON.stringify(saved);

  function update<K extends keyof Participant>(key: K, value: Participant[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setState("idle");
  }

  async function save() {
    setState("saving");
    setMessage("");
    const response = await fetch(`/api/crm/participants/${participant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: draft.status,
        payment_status: draft.payment_status,
        payment_amount: draft.payment_amount,
        instructions_status: draft.instructions_status,
        contact_status: draft.contact_status,
        attendance_status: draft.attendance_status,
        next_action: draft.next_action,
        notes: draft.notes,
      }),
    });
    const result = (await response.json()) as { message?: string; updated_at?: string };
    if (!response.ok) {
      setState("error");
      setMessage(result.message ?? "Не удалось сохранить.");
      if (response.status === 401) window.location.assign("/crm/login");
      return;
    }
    const next = { ...draft, updated_at: result.updated_at ?? draft.updated_at };
    setDraft(next);
    setSaved(next);
    setState("saved");
  }

  const telegramUrl = draft.telegram
    ? `https://t.me/${draft.telegram.replace(/^@/, "")}`
    : null;

  return (
    <article className={styles.participantCard}>
      <header className={styles.cardHeader}>
        <div>
          <div className={styles.nameLine}>
            <h2>{draft.name}</h2>
            <span className={`${styles.statusPill} ${styles[draft.status]}`}>{labels.registration[draft.status]}</span>
          </div>
          <p>Заявка {new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeZone: "Asia/Bishkek" }).format(new Date(draft.created_at))}</p>
        </div>
        <div className={styles.contactLinks}>
          <a href={`mailto:${draft.contact}`}><Mail size={15} /> {draft.contact}</a>
          {telegramUrl ? <a href={telegramUrl} target="_blank" rel="noreferrer"><MessageCircle size={15} /> {draft.telegram}</a> : null}
          {draft.telegram_chat_id ? <span><Check size={14} /> Telegram-бот подключён</span> : null}
        </div>
      </header>

      <div className={styles.fieldsGrid}>
        <label><span>Регистрация</span><select value={draft.status} onChange={(e) => update("status", e.target.value as Participant["status"])}>{Object.entries(labels.registration).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label><span>Оплата</span><select value={draft.payment_status} onChange={(e) => update("payment_status", e.target.value as Participant["payment_status"])}>{Object.entries(labels.payment).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label><span>Сумма, KGS</span><input type="number" min="0" step="100" value={draft.payment_amount} onChange={(e) => update("payment_amount", Number(e.target.value))} /></label>
        <label><span>Инструкции</span><select value={draft.instructions_status} onChange={(e) => update("instructions_status", e.target.value as Participant["instructions_status"])}>{Object.entries(labels.instructions).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label><span>Контакт</span><select value={draft.contact_status} onChange={(e) => update("contact_status", e.target.value as Participant["contact_status"])}>{Object.entries(labels.contact).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label><span>Посещение</span><select value={draft.attendance_status} onChange={(e) => update("attendance_status", e.target.value as Participant["attendance_status"])}>{Object.entries(labels.attendance).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>

      <div className={styles.notesGrid}>
        <label><span>Следующее действие</span><input value={draft.next_action} maxLength={500} placeholder="Например: напомнить об оплате 10 августа" onChange={(e) => update("next_action", e.target.value)} /></label>
        <label><span>Внутренние заметки</span><textarea value={draft.notes} maxLength={5000} placeholder="Пожелания, договорённости, важный контекст…" onChange={(e) => update("notes", e.target.value)} /></label>
      </div>

      <footer className={styles.cardFooter}>
        <p className={state === "error" ? styles.saveError : ""}>
          {state === "saved" ? <><Check size={14} /> Сохранено</> : null}
          {state === "error" ? <><CircleAlert size={14} /> {message}</> : null}
        </p>
        <button className={styles.saveButton} type="button" onClick={save} disabled={!isDirty || state === "saving"}>
          {state === "saving" ? <LoaderCircle className={styles.spin} size={16} /> : <Save size={16} />}
          {state === "saving" ? "Сохраняем…" : "Сохранить"}
        </button>
      </footer>
    </article>
  );
}

export default function CrmDashboard({ participants }: { participants: Participant[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const stats = {
    total: participants.length,
    paid: participants.filter((item) => item.payment_status === "paid").length,
    ready: participants.filter((item) => item.instructions_status !== "not_sent").length,
    confirmed: participants.filter((item) => item.status === "confirmed").length,
  };

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ru");
    return participants.filter((item) => {
      const matchesQuery = !normalized || [item.name, item.contact, item.telegram ?? "", item.notes, item.next_action]
        .some((value) => value.toLocaleLowerCase("ru").includes(normalized));
      const matchesFilter = filter === "all"
        || (filter === "unpaid" && item.payment_status !== "paid")
        || (filter === "instructions" && item.instructions_status === "not_sent")
        || (filter === "contact" && item.contact_status === "not_contacted")
        || (filter === "confirmed" && item.status === "confirmed");
      return matchesQuery && matchesFilter;
    });
  }, [filter, participants, query]);

  return (
    <>
      <section className={styles.statsGrid}>
        <div><Users size={19} /><span>Всего</span><strong>{stats.total}</strong></div>
        <div><Banknote size={19} /><span>Оплатили</span><strong>{stats.paid}</strong></div>
        <div><Send size={19} /><span>Получили инструкции</span><strong>{stats.ready}</strong></div>
        <div><UserCheck size={19} /><span>Подтверждены</span><strong>{stats.confirmed}</strong></div>
      </section>

      <section className={styles.toolbar}>
        <label className={styles.search}><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по имени, email, Telegram, заметкам…" /></label>
        <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} aria-label="Фильтр участников">
          <option value="all">Все участники</option>
          <option value="unpaid">Требуют оплаты</option>
          <option value="instructions">Без инструкций</option>
          <option value="contact">Без контакта</option>
          <option value="confirmed">Подтверждённые</option>
        </select>
      </section>

      <div className={styles.resultsLine}>Показано: {filtered.length} из {participants.length}</div>
      <section className={styles.cardsList}>
        {filtered.map((participant) => <ParticipantCard participant={participant} key={participant.id} />)}
        {!filtered.length ? <div className={styles.emptyState}>Ничего не найдено. Измените поиск или фильтр.</div> : null}
      </section>
    </>
  );
}
