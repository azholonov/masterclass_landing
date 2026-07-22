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

alter table public.workshop_registrations
  drop constraint if exists workshop_registrations_status_check;

alter table public.workshop_registrations
  add constraint workshop_registrations_status_check
  check (status in ('new', 'confirmed', 'cancelled', 'next_run'));

create or replace function public.register_workshop_participant(
  participant_name text,
  participant_contact text,
  participant_telegram text,
  participant_workshop text,
  participant_source text,
  participant_telegram_token_hash text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  workshop_capacity integer;
  occupied_places integer;
  assigned_status text;
begin
  workshop_capacity := case participant_workshop
    when 'vibecoding' then 12
    when 'token-economics' then 16
    else null
  end;

  if workshop_capacity is null then
    raise exception 'Unknown workshop';
  end if;

  -- Serialize registrations per workshop so concurrent requests cannot overbook it.
  perform pg_advisory_xact_lock(hashtext(participant_workshop));

  select count(*) into occupied_places
  from public.workshop_registrations
  where workshop = participant_workshop
    and status in ('new', 'confirmed');

  assigned_status := case
    when occupied_places >= workshop_capacity then 'next_run'
    else 'new'
  end;

  insert into public.workshop_registrations (
    name, contact, telegram, workshop, source, telegram_start_token_hash, status
  ) values (
    participant_name,
    participant_contact,
    nullif(participant_telegram, ''),
    participant_workshop,
    participant_source,
    participant_telegram_token_hash,
    assigned_status
  );

  return assigned_status;
end;
$$;

revoke all on function public.register_workshop_participant(text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.register_workshop_participant(text, text, text, text, text, text)
  to service_role;

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
