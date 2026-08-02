import nodemailer from "nodemailer";
import { workshops, type RegistrationStatus, type WorkshopId } from "@/lib/workshops";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createMailTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD?.replaceAll(" ", "");
  if (!user || !pass) throw new Error("Gmail SMTP credentials are not configured");

  return {
    user,
    transporter: nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    }),
  };
}

export async function sendWelcomeEmail(input: {
  name: string;
  email: string;
  workshop: WorkshopId;
  registrationStatus: RegistrationStatus;
  guideUrl?: string;
}) {
  const workshop = workshops[input.workshop];
  const isNextRun = input.registrationStatus === "next_run";
  const { user, transporter } = createMailTransporter();

  await transporter.sendMail({
    from: `Мастерская <${user}>`,
    to: input.email,
    subject: isNextRun ? `Вы в списке на следующий набор: ${workshop.title}` : `Вы зарегистрированы: ${workshop.title}`,
    text: [
      `Привет, ${input.name}!`,
      "",
      isNextRun
        ? `Все места на мастер-класс «${workshop.title}» заняты, но мы добавили вас в список на следующий набор.`
        : `Вы зарегистрированы на мастер-класс «${workshop.title}».`,
      ...(isNextRun ? [] : [`Дата: ${workshop.date}. Формат: ${workshop.format}.`]),
      "",
      isNextRun
        ? "Мы сообщим вам первыми, когда назначим новую дату."
        : "Что понадобится на мастер-классе:",
      ...(isNextRun
        ? []
        : [
            "- личный ноутбук;",
            "- активная платная подписка на один AI-инструмент: ChatGPT или Claude.",
            "",
            input.guideUrl ? `Ваша личная инструкция по подготовке: ${input.guideUrl}` : "Ближе к встрече мы отправим инструкцию по подготовке.",
            "Не пересылайте эту ссылку: она открывает ваш личный прогресс.",
          ]),
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#171717;max-width:600px">
        <h2>Привет, ${escapeHtml(input.name)}! 👋</h2>
        ${isNextRun
          ? `<p>Все места на мастер-класс <strong>«${escapeHtml(workshop.title)}»</strong> заняты, но мы добавили вас в список на следующий набор.</p><p>Мы сообщим вам первыми, когда назначим новую дату.</p>`
          : `<p>Вы зарегистрированы на мастер-класс <strong>«${escapeHtml(workshop.title)}»</strong>.</p><p><strong>Дата:</strong> ${escapeHtml(workshop.date)}<br><strong>Формат:</strong> ${escapeHtml(workshop.format)}</p><p><strong>Что понадобится на мастер-классе:</strong></p><ul><li>личный ноутбук;</li><li>активная платная подписка на один AI-инструмент: ChatGPT или Claude.</li></ul>${input.guideUrl ? `<p><a href="${escapeHtml(input.guideUrl)}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#c9ff27;color:#111;text-decoration:none;font-weight:700">Открыть личную инструкцию</a></p><p style="font-size:12px;color:#777">Не пересылайте эту ссылку: она открывает ваш личный прогресс.</p>` : `<p>Ближе к встрече мы отправим инструкцию по подготовке.</p>`}<p>До встречи!</p>`}
      </div>
    `,
  });
}

export async function sendGuideAccessEmail(input: {
  name: string;
  email: string;
  workshop: WorkshopId;
  guideUrl: string;
}) {
  const { user, transporter } = createMailTransporter();
  const workshop = workshops[input.workshop];

  await transporter.sendMail({
    from: `Мастерская <${user}>`,
    to: input.email,
    subject: `Личная инструкция: ${workshop.title}`,
    text: [
      `Привет, ${input.name}!`,
      "",
      `Ваша личная инструкция по подготовке к мастер-классу «${workshop.title}»:`,
      input.guideUrl,
      "",
      "Отмеченный прогресс сохраняется автоматически. Не пересылайте эту ссылку другим людям.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#171717;max-width:600px">
        <h2>Привет, ${escapeHtml(input.name)}! 👋</h2>
        <p>Ваша личная инструкция по подготовке к мастер-классу <strong>«${escapeHtml(workshop.title)}»</strong> готова.</p>
        <p><a href="${escapeHtml(input.guideUrl)}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#c9ff27;color:#111;text-decoration:none;font-weight:700">Открыть инструкцию</a></p>
        <p>Отмеченный прогресс сохраняется автоматически.</p>
        <p style="font-size:12px;color:#777">Не пересылайте эту ссылку другим людям. Новая ссылка, отправленная организатором, отключит предыдущую.</p>
      </div>
    `,
  });
}
