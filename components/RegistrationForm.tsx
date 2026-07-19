"use client";

import { FormEvent, useState } from "react";
import { ArrowUpRight, CheckCircle2, LoaderCircle } from "lucide-react";

type FormState = {
  status: "idle" | "success" | "error";
  message: string;
  telegramBotUrl?: string;
};

export function RegistrationForm() {
  const [state, setState] = useState<FormState>({ status: "idle", message: "" });
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setState({ status: "idle", message: "" });

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData.entries())),
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
      setPending(false);
    }
  }

  return (
    <form className="registration-form" onSubmit={handleSubmit}>
      <fieldset>
        <legend>Куда идём?</legend>
        <div className="workshop-options">
          <label>
            <input type="radio" name="workshop" value="vibecoding" defaultChecked />
            <span>📱 15 августа · Вайбкодим приложение</span>
          </label>
          <label>
            <input type="radio" name="workshop" value="token-economics" />
            <span>🪙 16 августа · Экономика токенов</span>
          </label>
        </div>
      </fieldset>

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
        <span>Telegram <em>необязательно</em></span>
        <input name="telegram" type="text" placeholder="@username" />
      </label>

      <div className="form-footer">
        <button className="button button-yellow" type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="spin" size={19} /> : "Забронировать место"}
          {!pending && <ArrowUpRight size={19} />}
        </button>
        <p>Нажимая кнопку, вы соглашаетесь на обработку данных.</p>
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
    </form>
  );
}
