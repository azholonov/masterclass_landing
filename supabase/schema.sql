create extension if not exists "pgcrypto";

create table if not exists public.workshop_registrations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 2 and 120),
  contact text not null check (char_length(contact) between 5 and 200),
  telegram text,
  telegram_chat_id bigint,
  telegram_start_token_hash text,
  workshop text not null check (workshop in ('vibecoding', 'token-economics')),
  source text not null default 'landing',
  status text not null default 'new' check (status in ('new', 'confirmed', 'cancelled'))
);

alter table public.workshop_registrations
  add column if not exists telegram_chat_id bigint,
  add column if not exists telegram_start_token_hash text;

create unique index if not exists workshop_registrations_telegram_start_token_idx
  on public.workshop_registrations (telegram_start_token_hash)
  where telegram_start_token_hash is not null;

alter table public.workshop_registrations enable row level security;

-- The website writes through a route handler using the service role.
-- No public read/write policies are intentionally created.
create index if not exists workshop_registrations_created_at_idx
  on public.workshop_registrations (created_at desc);

-- Make the new table immediately visible to the Supabase Data API.
notify pgrst, 'reload schema';
