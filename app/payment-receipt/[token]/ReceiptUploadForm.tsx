"use client";

import { useState } from "react";
import { Check, FileUp, LoaderCircle } from "lucide-react";
import styles from "../receipt.module.css";

export default function ReceiptUploadForm({ token }: { token: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || status === "uploading") return;

    setStatus("uploading");
    setMessage("");
    const body = new FormData();
    body.append("receipt", file);

    const response = await fetch(`/api/payment-receipts/${encodeURIComponent(token)}`, { method: "POST", body });
    const result = (await response.json()) as { message?: string };
    if (!response.ok) {
      setStatus("error");
      setMessage(result.message ?? "Не удалось загрузить чек.");
      return;
    }

    setStatus("success");
    setMessage(result.message ?? "Чек загружен.");
  }

  if (status === "success") {
    return <div className={styles.success}><Check size={22} /><p>{message}</p></div>;
  }

  return (
    <form className={styles.uploadForm} onSubmit={submit}>
      <label>
        <FileUp size={24} />
        <span>{file ? file.name : "Выберите фото или PDF чека"}</span>
        <small>JPG, PNG, WEBP или PDF · до 3 МБ</small>
        <input
          type="file"
          name="receipt"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(event) => { setFile(event.target.files?.[0] ?? null); setStatus("idle"); setMessage(""); }}
          required
        />
      </label>
      {message ? <p className={styles.error}>{message}</p> : null}
      <button type="submit" disabled={!file || status === "uploading"}>
        {status === "uploading" ? <LoaderCircle className={styles.spin} size={17} /> : <FileUp size={17} />}
        {status === "uploading" ? "Загружаем…" : "Загрузить чек"}
      </button>
    </form>
  );
}
