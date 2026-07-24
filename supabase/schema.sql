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
  add column if not exists telegram_start_token_hash text,
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists payment_amount integer not null default 0,
  add column if not exists paid_at timestamptz,
  add column if not exists instructions_status text not null default 'not_sent',
  add column if not exists instructions_sent_at timestamptz,
  add column if not exists contact_status text not null default 'not_contacted',
  add column if not exists last_contacted_at timestamptz,
  add column if not exists attendance_status text not null default 'pending',
  add column if not exists next_action text not null default '',
  add column if not exists notes text not null default '',
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists last_telegram_sent_at timestamptz,
  add column if not exists last_telegram_message_type text;

alter table public.workshop_registrations
  drop constraint if exists workshop_registrations_payment_status_check,
  drop constraint if exists workshop_registrations_payment_amount_check,
  drop constraint if exists workshop_registrations_instructions_status_check,
  drop constraint if exists workshop_registrations_contact_status_check,
  drop constraint if exists workshop_registrations_attendance_status_check;

alter table public.workshop_registrations
  add constraint workshop_registrations_payment_status_check
    check (payment_status in ('unpaid', 'partial', 'paid', 'refunded')),
  add constraint workshop_registrations_payment_amount_check
    check (payment_amount >= 0),
  add constraint workshop_registrations_instructions_status_check
    check (instructions_status in ('not_sent', 'sent', 'acknowledged')),
  add constraint workshop_registrations_contact_status_check
    check (contact_status in ('not_contacted', 'contacted', 'replied')),
  add constraint workshop_registrations_attendance_status_check
    check (attendance_status in ('pending', 'attended', 'no_show'));

alter table public.workshop_registrations
  drop constraint if exists workshop_registrations_last_telegram_message_type_check;

alter table public.workshop_registrations
  add constraint workshop_registrations_last_telegram_message_type_check
  check (last_telegram_message_type is null or last_telegram_message_type in ('announcement', 'schedule', 'payment', 'custom'));

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

create table if not exists public.crm_telegram_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  participant_id uuid not null references public.workshop_registrations(id) on delete cascade,
  message_type text not null check (message_type in ('announcement', 'schedule', 'payment', 'custom')),
  body text not null check (char_length(body) between 1 and 4096),
  delivery_status text not null default 'pending' check (delivery_status in ('pending', 'sent', 'failed')),
  telegram_message_id bigint,
  delivered_at timestamptz,
  error_message text
);

alter table public.crm_telegram_messages enable row level security;

create index if not exists crm_telegram_messages_participant_created_at_idx
  on public.crm_telegram_messages (participant_id, created_at desc);

-- The website writes through a route handler using the service role.
-- No public read/write policies are intentionally created.
create index if not exists workshop_registrations_created_at_idx
  on public.workshop_registrations (created_at desc);

-- Make the new table immediately visible to the Supabase Data API.
notify pgrst, 'reload schema';
