"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowUpRight, CheckCircle2, LoaderCircle, ShieldCheck, X } from "lucide-react";
import Script from "next/script";
import { workshops, type WorkshopId } from "@/lib/workshops";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          action: string;
          theme: "light" | "dark" | "auto";
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
        },
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId?: string) => void;
    };
  }
}

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

type FormState = {
  status: "idle" | "success" | "error";
  message: string;
  telegramBotUrl?: string;
};

type RegistrationFormProps = {
  availability: Record<WorkshopId, boolean>;
};

export function RegistrationForm({ availability }: RegistrationFormProps) {
  const [state, setState] = useState<FormState>({ status: "idle", message: "" });
  const [pending, setPending] = useState(false);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const challengeRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | undefined>(undefined);
  const submissionInFlightRef = useRef(false);
  const hasAvailablePlace = availability.vibecoding;

  async function submitRegistration(turnstileToken: string) {
    const form = formRef.current;
    if (!form || submissionInFlightRef.current) return;

    submissionInFlightRef.current = true;
    setPending(true);
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    payload["cf-turnstile-response"] = turnstileToken;

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { message?: string; telegramBotUrl?: string };

      setState({
        status: response.ok ? "success" : "error",
        message: result.message || "Не удалось отправить заявку.",
        telegramBotUrl: response.ok ? result.telegramBotUrl : undefined,
      });

      if (response.ok) form.reset();
    } catch {
      setState({ status: "error", message: "Ошибка соединения. Попробуйте ещё раз." });
    } finally {
      submissionInFlightRef.current = false;
      setPending(false);
      setVerificationOpen(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ status: "idle", message: "" });
    setVerificationError("");
    setVerificationOpen(true);
  }

  useEffect(() => {
    if (!verificationOpen || !turnstileReady || !challengeRef.current || !window.turnstile || !turnstileSiteKey) {
      return;
    }

    setVerifying(true);
    try {
      widgetIdRef.current = window.turnstile.render(challengeRef.current, {
        sitekey: turnstileSiteKey,
        action: "registration",
        theme: "light",
        callback: (token) => {
          setVerifying(false);
          setVerificationError("");
          void submitRegistration(token);
        },
        "expired-callback": () => {
          setVerifying(true);
          setVerificationError("Проверка истекла. Пройдите её ещё раз.");
        },
        "error-callback": () => {
          setVerifying(false);
          setVerificationError("Не удалось загрузить проверку. Попробуйте ещё раз.");
        },
      });
    } catch {
      setVerifying(false);
      setVerificationError("Не удалось загрузить проверку. Попробуйте ещё раз.");
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = undefined;
      }
    };
  }, [turnstileReady, verificationOpen]);

  useEffect(() => {
    if (!verificationOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submissionInFlightRef.current) {
        setVerificationOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [verificationOpen]);

  return (
    <form ref={formRef} className="registration-form" onSubmit={handleSubmit}>
      <input type="hidden" name="workshop" value="vibecoding" />

      {turnstileSiteKey && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onReady={() => setTurnstileReady(true)}
        />
      )}

      <div className="form-price">
        <span>Мастер-класс</span>
        <strong>{workshops.vibecoding.price}</strong>
      </div>

      <div className="field-grid">
        <label>
          <span>Ваше имя</span>
          <input name="name" type="text" placeholder="Например, Айжан" minLength={2} required />
        </label>
        <label>
          <span>Email</span>
          <input name="contact" type="email" placeholder="you@example.com" autoComplete="email" required />
        </label>
      </div>

      <label>
        <span>Telegram-аккаунт <em>необязательно</em></span>
        <input name="telegram" type="text" placeholder="@username — если есть" autoComplete="off" />
        <small className="field-help">Нет Telegram? Оставьте это поле пустым.</small>
      </label>

      {!turnstileSiteKey && (
        <p className="turnstile-missing">Регистрация временно недоступна: проверка безопасности не настроена.</p>
      )}

      <div className="form-footer">
        <button className="button button-primary" type="submit" disabled={pending || !turnstileSiteKey}>
          {pending ? <LoaderCircle className="spin" size={19} /> : hasAvailablePlace ? "Забронировать место" : "Записаться на следующий набор"}
          {!pending && <ArrowUpRight size={19} />}
        </button>
        <p>{hasAvailablePlace ? "Нажимая кнопку, вы соглашаетесь на обработку данных." : "Мы сохраним заявку и сообщим вам о следующем запуске."}</p>
      </div>

      {state.message && (
        <div className={`form-status ${state.status}`} role="status">
          <p>
            {state.status === "success" && <CheckCircle2 size={18} />}
            {state.message}
          </p>
          {state.telegramBotUrl && (
            <a href={state.telegramBotUrl} target="_blank" rel="noreferrer">
              Получить приветствие в Telegram <ArrowUpRight size={17} />
            </a>
          )}
        </div>
      )}

      {verificationOpen && turnstileSiteKey && (
        <div
          className="security-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !pending) setVerificationOpen(false);
          }}
        >
          <div
            className="security-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="security-modal-title"
            aria-describedby="security-modal-description"
          >
            <button
              className="security-modal-close"
              type="button"
              aria-label="Закрыть проверку"
              onClick={() => setVerificationOpen(false)}
              disabled={pending}
              autoFocus
            >
              <X size={18} />
            </button>
            <div className="security-modal-icon"><ShieldCheck size={25} /></div>
            <p className="security-modal-kicker">Cloudflare</p>
            <h3 id="security-modal-title">Быстрая проверка</h3>
            <p id="security-modal-description">Подтвердите, что форму отправляет человек. После проверки заявка уйдёт автоматически.</p>
            <div className="turnstile-popup-widget" ref={challengeRef} />
            <div className={`security-modal-state${verificationError ? " error" : ""}`} aria-live="polite">
              {pending ? (
                <><LoaderCircle className="spin" size={16} /> Отправляем заявку…</>
              ) : verificationError ? (
                verificationError
              ) : verifying || !turnstileReady ? (
                <><LoaderCircle className="spin" size={16} /> Загружаем проверку…</>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
