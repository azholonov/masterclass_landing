"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, LoaderCircle, LockKeyhole } from "lucide-react";
import styles from "../crm.module.css";

export default function LoginForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/crm/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
    });

    const result = (await response.json()) as { message?: string };
    if (!response.ok) {
      setError(result.message ?? "Не удалось войти.");
      setPending(false);
      return;
    }

    window.location.assign("/crm");
  }

  return (
    <form className={styles.loginForm} onSubmit={handleSubmit}>
      <div className={styles.loginIcon}><LockKeyhole size={24} /></div>
      <div>
        <p className={styles.kicker}>Только для организатора</p>
        <h1>Вход в CRM</h1>
        <p className={styles.loginIntro}>Участники, оплаты и подготовка к мастер-классу.</p>
      </div>
      <label>
        <span>Логин</span>
        <input name="username" autoComplete="username" required autoFocus />
      </label>
      <label>
        <span>Пароль</span>
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {error ? <p className={styles.errorMessage} role="alert">{error}</p> : null}
      <button className={styles.primaryButton} type="submit" disabled={pending}>
        {pending ? <LoaderCircle className={styles.spin} size={18} /> : <ArrowRight size={18} />}
        {pending ? "Входим…" : "Войти"}
      </button>
    </form>
  );
}
