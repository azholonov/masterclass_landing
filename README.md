# Мастерская

Landing page for two offline masterclasses in Bishkek.

Production: https://masterclasslanding.vercel.app

## Local setup

1. Run `npm install`.
2. Copy `.env.example` to `.env.local` and add Supabase, Telegram, and Gmail values.
3. Run `supabase/schema.sql` in the Supabase SQL Editor.
4. Run `npm run dev`.

## Vercel

Import the repository in Vercel and add these environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ADMIN_CHAT_ID`
- `TELEGRAM_WEBHOOK_SECRET`
- `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`
- `GMAIL_USER` (`soloapps.dev@gmail.com`)
- `GMAIL_APP_PASSWORD` (a Google App Password, not the account password)

The service role key is server-only and must never be prefixed with `NEXT_PUBLIC_`.

## Telegram setup

1. Create a bot with `@BotFather` and add its token and username to Vercel.
2. Start the bot yourself, then get your numeric chat ID from a Bot API `getUpdates` response and set `TELEGRAM_ADMIN_CHAT_ID`.
3. Generate a long random `TELEGRAM_WEBHOOK_SECRET`.
4. After deployment, register the webhook:

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://azholonov.vercel.app/api/telegram/webhook","secret_token":"<WEBHOOK_SECRET>"}'
```

Telegram bots cannot initiate a private chat from an `@username`. After registering,
the participant gets a personal bot link and must press **Start** once. The bot then
sends the welcome message and saves the chat ID for later communication.

## Gmail setup

Enable 2-Step Verification on `soloapps.dev@gmail.com`, create a Google App Password,
and use that 16-character value for `GMAIL_APP_PASSWORD`.
