create extension if not exists "pgcrypto";

create table if not exists public.workshop_registrations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 2 and 120),
  contact text not null check (char_length(contact) between 5 and 200),
  telegram text,
  workshop text not null check (workshop in ('vibecoding', 'token-economics')),
  source text not null default 'landing',
  status text not null default 'new' check (status in ('new', 'confirmed', 'cancelled'))
);

alter table public.workshop_registrations enable row level security;

-- The website writes through a server action using the service role.
-- No public read/write policies are intentionally created.
create index if not exists workshop_registrations_created_at_idx
  on public.workshop_registrations (created_at desc);
