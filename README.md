# Мастерская

Landing page for two offline masterclasses in Bishkek.

## Local setup

1. Run `npm install`.
2. Copy `.env.example` to `.env.local` and add Supabase values.
3. Run `supabase/schema.sql` in the Supabase SQL Editor.
4. Run `npm run dev`.

## Vercel

Import the repository in Vercel and add these environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

The service role key is server-only and must never be prefixed with `NEXT_PUBLIC_`.
