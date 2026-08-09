"use client";

import { useMemo, useState } from "react";
import {
  Banknote, BookOpen, CalendarClock, Check, CircleAlert, Copy, CreditCard, ExternalLink,
  Eye, FileText, LoaderCircle, Mail, Megaphone, MessageCircle, MessageSquareText, Save,
  Search, Send, Upload, UserCheck, Users,
} from "lucide-react";
import type { Participant, TelegramMessageType } from "@/lib/crm";
import styles from "./crm.module.css";

const labels = {
  registration: { new: "Новая", confirmed: "Подтверждён", cancelled: "Отменён", next_run: "Следующий набор" },
  payment: { unpaid: "Не оплачено", partial: "Частично", paid: "Оплачено", refunded: "Возврат" },
  instructions: { not_sent: "Не отправлены", sent: "Отправлены", acknowledged: "Подтверждены" },
  contact: { not_contacted: "Не связывались", contacted: "Связались", replied: "Ответил(а)" },
  attendance: { pending: "Ожидается", attended: "Пришёл/пришла", no_show: "Не пришёл/пришла" },
} as const;

type Filter = "all" | "unpaid" | "instructions" | "contact" | "confirmed";
type PreparedEmailAction = "payment_request" | "receipt_upload" | "payment_confirmation";
type PaymentReceipt = {
  id: string;
  createdAt: string;
  filename: string;
  contentType: string;
  fileSize: number;
  reviewStatus: "submitted" | "approved" | "rejected";
  url: string | null;
};

const telegramTypeLabels: Record<TelegramMessageType, string> = {
  announcement: "Объявление",
  schedule: "Изменение программы",
  payment: "Об оплате",
  custom: "Свободный текст",
};

function messageTemplate(type: TelegramMessageType, participant: Participant) {
  const greeting = `Привет, ${participant.name}! 👋`;
  if (type === "announcement") return `${greeting}\n\nВажное объявление по мастер-классу:\n\n`;
  if (type === "schedule") return `${greeting}\n\nЕсть изменение по мастер-классу:\n\n`;
  if (type === "payment") return `${greeting}\n\nНапоминаем об оплате участия в мастер-классе.\n\n`;
  return `${greeting}\n\n`;
}

function emailTemplate(participant: Participant) {
  return `Здравствуйте, ${participant.name}!\n\n`;
}

function ParticipantCard({ participant }: { participant: Participant }) {
  const [draft, setDraft] = useState(participant);
  const [saved, setSaved] = useState(participant);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("Мастер-класс: важная информация");
  const [emailText, setEmailText] = useState("");
  const [emailState, setEmailState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [emailError, setEmailError] = useState("");
  const [telegramOpen, setTelegramOpen] = useState(false);
  const [telegramType, setTelegramType] = useState<TelegramMessageType>("announcement");
  const [telegramText, setTelegramText] = useState("");
  const [telegramState, setTelegramState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [telegramError, setTelegramError] = useState("");
  const [guideState, setGuideState] = useState<"idle" | "sending" | "sent" | "partial" | "error">("idle");
  const [guideMessage, setGuideMessage] = useState("");
  const [guideUrl, setGuideUrl] = useState("");
  const [preparedEmailState, setPreparedEmailState] = useState<{
    action: PreparedEmailAction | null;
    status: "idle" | "sending" | "sent" | "partial" | "error";
    message: string;
  }>({ action: null, status: "idle", message: "" });
  const [receiptsOpen, setReceiptsOpen] = useState(false);
  const [receiptsState, setReceiptsState] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [receiptsError, setReceiptsError] = useState("");
  const isDirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const isMobileWorkshop = draft.workshop === "vibecoding" || draft.workshop === "vibecoding-kg";

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

  function toggleEmail() {
    setEmailOpen((open) => {
      if (!open && !emailText) setEmailText(emailTemplate(draft));
      return !open;
    });
    setEmailState("idle");
    setEmailError("");
  }

  async function sendEmail() {
    const subject = emailSubject.trim();
    const text = emailText.trim();
    if (!subject || !text || !window.confirm(`Отправить письмо участнику ${draft.name} на ${draft.contact}?`)) return;

    setEmailState("sending");
    setEmailError("");
    const response = await fetch(`/api/crm/participants/${participant.id}/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, text }),
    });
    const result = (await response.json()) as { message?: string; sentAt?: string };
    if (!response.ok) {
      setEmailState("error");
      setEmailError(result.message ?? "Не удалось отправить письмо.");
      if (response.status === 401) window.location.assign("/crm/login");
      return;
    }

    const sentAt = result.sentAt ?? new Date().toISOString();
    setDraft((current) => ({
      ...current,
      contact_status: current.contact_status === "not_contacted" ? "contacted" : current.contact_status,
      last_contacted_at: sentAt,
      updated_at: sentAt,
    }));
    setSaved((current) => ({
      ...current,
      contact_status: current.contact_status === "not_contacted" ? "contacted" : current.contact_status,
      last_contacted_at: sentAt,
      updated_at: sentAt,
    }));
    setEmailState("sent");
  }

  function chooseTelegramTemplate(type: TelegramMessageType) {
    setTelegramType(type);
    setTelegramText(messageTemplate(type, draft));
    setTelegramState("idle");
    setTelegramError("");
  }

  async function sendTelegram() {
    const text = telegramText.trim();
    if (!text || !window.confirm(`Отправить сообщение участнику ${draft.name}?`)) return;

    setTelegramState("sending");
    setTelegramError("");
    const response = await fetch(`/api/crm/participants/${participant.id}/telegram`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageType: telegramType, text }),
    });
    const result = (await response.json()) as { message?: string; sentAt?: string };
    if (!response.ok) {
      setTelegramState("error");
      setTelegramError(result.message ?? "Не удалось отправить сообщение.");
      if (response.status === 401) window.location.assign("/crm/login");
      return;
    }

    const sentAt = result.sentAt ?? new Date().toISOString();
    setDraft((current) => ({ ...current, last_telegram_sent_at: sentAt, last_telegram_message_type: telegramType }));
    setSaved((current) => ({ ...current, last_telegram_sent_at: sentAt, last_telegram_message_type: telegramType }));
    setTelegramState("sent");
  }

  async function issueGuideAccess() {
    if (!window.confirm(`Создать новую личную ссылку для ${draft.name}? Предыдущая ссылка перестанет работать.`)) return;

    setGuideState("sending");
    setGuideMessage("");
    setGuideUrl("");
    const response = await fetch(`/api/crm/participants/${participant.id}/guide-access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailType: "guide_access" }),
    });
    const result = (await response.json()) as {
      message?: string;
      emailed?: boolean;
      guideUrl?: string;
      sentAt?: string;
    };

    if (!response.ok || !result.guideUrl) {
      setGuideState("error");
      setGuideMessage(result.message ?? "Не удалось создать доступ.");
      if (response.status === 401) window.location.assign("/crm/login");
      return;
    }

    const sentAt = result.sentAt ?? new Date().toISOString();
    const next = {
      ...draft,
      instructions_status: "sent" as const,
      instructions_sent_at: draft.instructions_sent_at ?? sentAt,
      updated_at: sentAt,
    };
    setDraft(next);
    setSaved(next);
    setGuideUrl(result.guideUrl);
    setGuideState(result.emailed ? "sent" : "partial");
    setGuideMessage(result.emailed ? "Личная ссылка отправлена на email." : result.message ?? "Скопируйте ссылку вручную.");
  }

  async function sendPreparedEmail(action: PreparedEmailAction) {
    const confirmation = action === "payment_request"
      ? `Отправить ${draft.name} письмо с реквизитами MBANK и ссылкой на Telegram-бот?`
      : action === "receipt_upload"
        ? `Отправить ${draft.name} одноразовую ссылку для загрузки чека?`
        : `Оплата от ${draft.name} проверена? Письмо закрепит место, отметит 5 000 сом как оплаченные и выдаст доступ к guide.`;
    if (!window.confirm(confirmation)) return;

    setPreparedEmailState({ action, status: "sending", message: "" });
    const isPaymentConfirmation = action === "payment_confirmation";
    const response = await fetch(
      `/api/crm/participants/${participant.id}/${isPaymentConfirmation ? "guide-access" : "email"}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isPaymentConfirmation
          ? { emailType: "payment_confirmation" }
          : { template: action }),
      },
    );
    const result = (await response.json()) as {
      message?: string;
      emailed?: boolean;
      guideUrl?: string;
      sentAt?: string;
      paymentAmount?: number;
    };

    if (!response.ok) {
      setPreparedEmailState({ action, status: "error", message: result.message ?? "Не удалось отправить письмо." });
      if (response.status === 401) window.location.assign("/crm/login");
      return;
    }

    const sentAt = result.sentAt ?? new Date().toISOString();
    if (!isPaymentConfirmation) {
      const next = {
        ...draft,
        contact_status: draft.contact_status === "not_contacted" ? "contacted" as const : draft.contact_status,
        last_contacted_at: sentAt,
        updated_at: sentAt,
      };
      setDraft(next);
      setSaved(next);
      setPreparedEmailState({
        action,
        status: "sent",
        message: action === "payment_request" ? "Запрос оплаты отправлен." : "Ссылка для загрузки чека отправлена.",
      });
      return;
    }

    const next = {
      ...draft,
      status: "confirmed" as const,
      payment_status: "paid" as const,
      payment_amount: result.paymentAmount ?? 5_000,
      paid_at: sentAt,
      instructions_status: "sent" as const,
      instructions_sent_at: draft.instructions_sent_at ?? sentAt,
      contact_status: draft.contact_status === "not_contacted" ? "contacted" as const : draft.contact_status,
      last_contacted_at: sentAt,
      updated_at: sentAt,
    };
    setDraft(next);
    setSaved(next);
    if (result.guideUrl) {
      setGuideUrl(result.guideUrl);
      setGuideMessage(result.emailed ? "Личная ссылка отправлена на email." : result.message ?? "Скопируйте ссылку вручную.");
      setGuideState(result.emailed ? "sent" : "partial");
    }
    setPreparedEmailState({
      action,
      status: result.emailed ? "sent" : "partial",
      message: result.emailed
        ? "Оплата подтверждена, место закреплено, guide отправлен."
        : result.message ?? "Оплата сохранена, но письмо не отправилось.",
    });
  }

  async function loadReceipts() {
    if (receiptsOpen) {
      setReceiptsOpen(false);
      return;
    }

    setReceiptsOpen(true);
    setReceiptsState("loading");
    setReceiptsError("");
    const response = await fetch(`/api/crm/participants/${participant.id}/receipts`, { cache: "no-store" });
    const result = (await response.json()) as { message?: string; receipts?: PaymentReceipt[] };
    if (!response.ok) {
      setReceiptsState("error");
      setReceiptsError(result.message ?? "Не удалось загрузить чеки.");
      if (response.status === 401) window.location.assign("/crm/login");
      return;
    }
    setReceipts(result.receipts ?? []);
    setReceiptsState("loaded");
  }

  async function copyGuideUrl() {
    if (!guideUrl) return;
    await navigator.clipboard.writeText(guideUrl);
    setGuideMessage("Ссылка скопирована.");
  }

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

      <section className={styles.preparedEmailsSection}>
        <div className={styles.preparedEmailsHeading}>
          <div>
            <strong>Готовые письма</strong>
            <span>Запрос оплаты → ссылка на чек → подтверждение после проверки</span>
          </div>
          {preparedEmailState.message ? (
            <p className={preparedEmailState.status === "error" ? styles.saveError : ""}>
              {preparedEmailState.status === "error" ? <CircleAlert size={14} /> : <Check size={14} />}
              {preparedEmailState.message}
            </p>
          ) : null}
        </div>
        <div className={styles.preparedEmailActions}>
          <button
            type="button"
            onClick={() => sendPreparedEmail("payment_request")}
            disabled={preparedEmailState.status === "sending" || draft.status === "cancelled"}
          >
            {preparedEmailState.action === "payment_request" && preparedEmailState.status === "sending"
              ? <LoaderCircle className={styles.spin} size={16} />
              : <CreditCard size={16} />}
            1. Запросить оплату
          </button>
          <button
            type="button"
            onClick={() => sendPreparedEmail("receipt_upload")}
            disabled={preparedEmailState.status === "sending" || draft.status === "cancelled"}
          >
            {preparedEmailState.action === "receipt_upload" && preparedEmailState.status === "sending"
              ? <LoaderCircle className={styles.spin} size={16} />
              : <Upload size={16} />}
            2. Запросить чек
          </button>
          <button
            type="button"
            onClick={() => sendPreparedEmail("payment_confirmation")}
            disabled={preparedEmailState.status === "sending" || draft.status === "cancelled" || !isMobileWorkshop}
          >
            {preparedEmailState.action === "payment_confirmation" && preparedEmailState.status === "sending"
              ? <LoaderCircle className={styles.spin} size={16} />
              : <UserCheck size={16} />}
            3. Подтвердить оплату и место
          </button>
        </div>
        <div className={styles.receiptsPanel}>
          <button type="button" onClick={loadReceipts} disabled={receiptsState === "loading"}>
            {receiptsState === "loading" ? <LoaderCircle className={styles.spin} size={15} /> : <FileText size={15} />}
            {receiptsOpen ? "Скрыть загруженные чеки" : "Показать загруженные чеки"}
          </button>
          {receiptsOpen ? (
            <div className={styles.receiptsList}>
              {receiptsState === "error" ? <p className={styles.saveError}>{receiptsError}</p> : null}
              {receiptsState === "loaded" && !receipts.length ? <p>Загруженных чеков пока нет.</p> : null}
              {receipts.map((receipt) => (
                <div key={receipt.id}>
                  <FileText size={16} />
                  <span>
                    <strong>{receipt.filename}</strong>
                    <small>
                      {new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bishkek" }).format(new Date(receipt.createdAt))}
                      {` · ${(receipt.fileSize / 1024).toFixed(0)} КБ · ${receipt.reviewStatus === "approved" ? "подтверждён" : "ожидает проверки"}`}
                    </small>
                  </span>
                  {receipt.url ? <a href={receipt.url} target="_blank" rel="noreferrer"><Eye size={14} /> Открыть</a> : <em>Файл недоступен</em>}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className={styles.guideAccessSection}>
        <div className={styles.guideAccessSummary}>
          <div className={styles.guideAccessIcon}><BookOpen size={18} /></div>
          <div>
            <strong>Личная инструкция</strong>
            <span>{draft.guide_completed_items.length} из 8 пунктов готово{draft.guide_progress_updated_at
              ? ` · обновлено ${new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bishkek" }).format(new Date(draft.guide_progress_updated_at))}`
              : ""}</span>
          </div>
          <button type="button" onClick={issueGuideAccess} disabled={guideState === "sending" || draft.status === "cancelled" || draft.status === "next_run"}>
            {guideState === "sending" ? <LoaderCircle className={styles.spin} size={15} /> : <Send size={15} />}
            {guideState === "sending" ? "Отправляем…" : "Переотправить доступ"}
          </button>
        </div>
        {guideUrl ? (
          <div className={styles.guideAccessLink}>
            <input value={guideUrl} readOnly aria-label="Личная ссылка на инструкцию" />
            <button type="button" onClick={copyGuideUrl}><Copy size={14} /> Копировать</button>
            <a href={guideUrl} target="_blank" rel="noreferrer" aria-label="Открыть личную ссылку"><ExternalLink size={15} /></a>
          </div>
        ) : null}
        {guideMessage ? <p className={guideState === "error" ? styles.saveError : ""}>{guideMessage}</p> : null}
      </section>

      <section className={styles.emailSection}>
        <div className={styles.telegramSectionHeader}>
          <div>
            <span><Mail size={15} /> Email-сообщение</span>
            <small>{draft.contact}</small>
          </div>
          <button type="button" onClick={toggleEmail}>
            <Mail size={14} /> {emailOpen ? "Закрыть" : "Написать"}
          </button>
        </div>

        {emailOpen ? (
          <div className={styles.telegramComposer}>
            <label>
              <span>Тема письма</span>
              <input
                className={styles.messageSubject}
                value={emailSubject}
                maxLength={160}
                onChange={(event) => { setEmailSubject(event.target.value); setEmailState("idle"); }}
                placeholder="Введите тему…"
              />
            </label>
            <label>
              <span>Сообщение</span>
              <textarea
                value={emailText}
                maxLength={10000}
                onChange={(event) => { setEmailText(event.target.value); setEmailState("idle"); }}
                placeholder="Введите сообщение…"
                autoFocus
              />
              <small>{emailText.length} / 10 000</small>
            </label>
            <div className={styles.telegramActions}>
              <p className={emailState === "error" ? styles.saveError : ""}>
                {emailState === "sent" ? <><Check size={14} /> Письмо отправлено</> : null}
                {emailState === "error" ? <><CircleAlert size={14} /> {emailError}</> : null}
              </p>
              <button type="button" onClick={sendEmail} disabled={!emailSubject.trim() || !emailText.trim() || emailState === "sending"}>
                {emailState === "sending" ? <LoaderCircle className={styles.spin} size={15} /> : <Send size={15} />}
                {emailState === "sending" ? "Отправляем…" : "Отправить по email"}
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className={styles.telegramSection}>
        <div className={styles.telegramSectionHeader}>
          <div>
            <span><MessageSquareText size={15} /> Telegram-сообщение</span>
            <small>
              {draft.last_telegram_sent_at
                ? `Последнее отправлено ${new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bishkek" }).format(new Date(draft.last_telegram_sent_at))}`
                : draft.telegram_chat_id ? "Сообщений из CRM ещё не было" : "Участник ещё не запустил бота"}
            </small>
          </div>
          <button type="button" onClick={() => setTelegramOpen((open) => !open)} disabled={!draft.telegram_chat_id}>
            <Send size={14} /> {telegramOpen ? "Закрыть" : "Написать"}
          </button>
        </div>

        {telegramOpen && draft.telegram_chat_id ? (
          <div className={styles.telegramComposer}>
            <div className={styles.templateButtons}>
              <button type="button" className={telegramType === "announcement" ? styles.activeTemplate : ""} onClick={() => chooseTelegramTemplate("announcement")}><Megaphone size={14} /> Объявление</button>
              <button type="button" className={telegramType === "schedule" ? styles.activeTemplate : ""} onClick={() => chooseTelegramTemplate("schedule")}><CalendarClock size={14} /> Изменение</button>
              <button type="button" className={telegramType === "payment" ? styles.activeTemplate : ""} onClick={() => chooseTelegramTemplate("payment")}><CreditCard size={14} /> Оплата</button>
              <button type="button" className={telegramType === "custom" ? styles.activeTemplate : ""} onClick={() => chooseTelegramTemplate("custom")}><MessageCircle size={14} /> Свой текст</button>
            </div>
            <label>
              <span>{telegramTypeLabels[telegramType]}</span>
              <textarea value={telegramText} maxLength={4000} onChange={(event) => { setTelegramText(event.target.value); setTelegramState("idle"); }} placeholder="Введите сообщение…" autoFocus />
              <small>{telegramText.length} / 4000</small>
            </label>
            <div className={styles.telegramActions}>
              <p className={telegramState === "error" ? styles.saveError : ""}>
                {telegramState === "sent" ? <><Check size={14} /> Доставлено Telegram</> : null}
                {telegramState === "error" ? <><CircleAlert size={14} /> {telegramError}</> : null}
              </p>
              <button type="button" onClick={sendTelegram} disabled={!telegramText.trim() || telegramState === "sending"}>
                {telegramState === "sending" ? <LoaderCircle className={styles.spin} size={15} /> : <Send size={15} />}
                {telegramState === "sending" ? "Отправляем…" : "Отправить в Telegram"}
              </button>
            </div>
          </div>
        ) : null}
      </section>

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
