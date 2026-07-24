import { workshops, type RegistrationStatus, type WorkshopId } from "@/lib/workshops";

type SendMessageOptions = {
  parseMode?: "HTML";
};

type TelegramSendMessageResponse = {
  ok?: boolean;
  result?: { message_id?: number };
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

  const data = (await response.json()) as TelegramSendMessageResponse;
  if (!data.ok || typeof data.result?.message_id !== "number") {
    throw new Error("Telegram sendMessage returned an invalid response");
  }

  return { messageId: data.result.message_id };
}

export async function notifyAdminAboutRegistration(input: {
  name: string;
  email: string;
  telegram: string;
  workshop: WorkshopId;
  registrationStatus: RegistrationStatus;
}) {
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!adminChatId) throw new Error("TELEGRAM_ADMIN_CHAT_ID is not configured");

  const workshop = workshops[input.workshop];
  const telegram = input.telegram || "не указан";
  const text = [
    input.registrationStatus === "next_run" ? "<b>Новая заявка на следующий набор 📝</b>" : "<b>Новая регистрация 🎉</b>",
    "",
    `<b>Имя:</b> ${escapeHtml(input.name)}`,
    `<b>Email:</b> ${escapeHtml(input.email)}`,
    `<b>Telegram:</b> ${escapeHtml(telegram)}`,
    `<b>Мастер-класс:</b> ${escapeHtml(workshop.title)}`,
    `<b>Дата:</b> ${escapeHtml(workshop.date)}`,
  ].join("\n");

  await sendTelegramMessage(adminChatId, text, { parseMode: "HTML" });
}

export function participantWelcomeText(name: string, workshopId: WorkshopId, registrationStatus: RegistrationStatus = "new") {
  const workshop = workshops[workshopId];
  if (registrationStatus === "next_run") {
    return [
      `Привет, ${name}! 👋`,
      "",
      `Все места на мастер-класс «${workshop.title}» заняты, но вы в списке на следующий набор.`,
      "Мы напишем вам первыми, когда назначим новую дату.",
    ].join("\n");
  }
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
