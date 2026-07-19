import nodemailer from "nodemailer";
import { workshops, type WorkshopId } from "@/lib/workshops";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendWelcomeEmail(input: {
  name: string;
  email: string;
  workshop: WorkshopId;
}) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD?.replaceAll(" ", "");
  if (!user || !pass) throw new Error("Gmail SMTP credentials are not configured");

  const workshop = workshops[input.workshop];
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `Мастерская <${user}>`,
    to: input.email,
    subject: `Вы зарегистрированы: ${workshop.title}`,
    text: [
      `Привет, ${input.name}!`,
      "",
      `Вы зарегистрированы на мастер-класс «${workshop.title}».`,
      `Дата: ${workshop.date}. Формат: ${workshop.format}.`,
      "",
      "Ближе к встрече мы отправим точное время, адрес или ссылку для подключения.",
      "До встречи!",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#171717;max-width:600px">
        <h2>Привет, ${escapeHtml(input.name)}! 👋</h2>
        <p>Вы зарегистрированы на мастер-класс <strong>«${escapeHtml(workshop.title)}»</strong>.</p>
        <p><strong>Дата:</strong> ${escapeHtml(workshop.date)}<br><strong>Формат:</strong> ${escapeHtml(workshop.format)}</p>
        <p>Ближе к встрече мы отправим точное время, адрес или ссылку для подключения.</p>
        <p>До встречи!</p>
      </div>
    `,
  });
}
