import { workshops, type WorkshopId } from "@/lib/workshops";

type SendMessageOptions = {
  parseMode?: "HTML";
};

function getBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  options: SendMessageOptions = {},
) {
  const token = getBotToken();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: options.parseMode,
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram sendMessage failed (${response.status}): ${body.slice(0, 300)}`);
  }
}

export async function notifyAdminAboutRegistration(input: {
  name: string;
  email: string;
  telegram: string;
  workshop: WorkshopId;
}) {
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!adminChatId) throw new Error("TELEGRAM_ADMIN_CHAT_ID is not configured");

  const workshop = workshops[input.workshop];
  const telegram = input.telegram || "не указан";
  const text = [
    "<b>Новая регистрация 🎉</b>",
    "",
    `<b>Имя:</b> ${escapeHtml(input.name)}`,
    `<b>Email:</b> ${escapeHtml(input.email)}`,
    `<b>Telegram:</b> ${escapeHtml(telegram)}`,
    `<b>Мастер-класс:</b> ${escapeHtml(workshop.title)}`,
    `<b>Дата:</b> ${escapeHtml(workshop.date)}`,
  ].join("\n");

  await sendTelegramMessage(adminChatId, text, { parseMode: "HTML" });
}

export function participantWelcomeText(name: string, workshopId: WorkshopId) {
  const workshop = workshops[workshopId];
  return [
    `Привет, ${name}! 👋`,
    "",
    `Вы зарегистрированы на мастер-класс «${workshop.title}».`,
    `Дата: ${workshop.date}. Формат: ${workshop.format}.`,
    "",
    "Ближе к встрече здесь появятся точное время, адрес или ссылка для подключения.",
    "До встречи!",
  ].join("\n");
}
