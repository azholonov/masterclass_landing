create extension if not exists "pgcrypto";

create table if not exists public.workshop_registrations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 2 and 120),
  contact text not null check (char_length(contact) between 5 and 200),
  telegram text,
  telegram_chat_id bigint,
  telegram_start_token_hash text,
  guide_access_token_hash text,
  guide_completed_items text[] not null default '{}',
  guide_progress_updated_at timestamptz,
  workshop text not null check (workshop in ('vibecoding-kg', 'vibecoding', 'token-economics')),
  source text not null default 'landing',
  status text not null default 'new' check (status in ('new', 'confirmed', 'cancelled'))
);

alter table public.workshop_registrations
  add column if not exists telegram_chat_id bigint,
  add column if not exists telegram_start_token_hash text,
  add column if not exists guide_access_token_hash text,
  add column if not exists guide_completed_items text[] not null default '{}',
  add column if not exists guide_progress_updated_at timestamptz,
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

alter table public.workshop_registrations
  drop constraint if exists workshop_registrations_workshop_check;

alter table public.workshop_registrations
  add constraint workshop_registrations_workshop_check
  check (workshop in ('vibecoding-kg', 'vibecoding', 'token-economics'));

alter table public.workshop_registrations
  drop constraint if exists workshop_registrations_telegram_length_check;

alter table public.workshop_registrations
  add constraint workshop_registrations_telegram_length_check
  check (telegram is null or char_length(telegram) between 5 and 33) not valid;

alter table public.workshop_registrations
  drop constraint if exists workshop_registrations_guide_token_hash_check,
  drop constraint if exists workshop_registrations_guide_completed_items_check;

alter table public.workshop_registrations
  add constraint workshop_registrations_guide_token_hash_check
    check (guide_access_token_hash is null or guide_access_token_hash ~ '^[0-9a-f]{64}$'),
  add constraint workshop_registrations_guide_completed_items_check
    check (
      cardinality(guide_completed_items) <= 8
      and guide_completed_items <@ array[
        'laptop', 'space', 'ai', 'phone', 'accounts', 'doctor', 'device', 'hello'
      ]::text[]
    );

create table if not exists public.api_rate_limits (
  action text not null,
  key_hash text not null,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (action, key_hash)
);

alter table public.api_rate_limits enable row level security;

revoke all on table public.api_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.api_rate_limits to service_role;

create or replace function public.consume_api_rate_limit(
  rate_action text,
  rate_key_hash text,
  rate_limit integer,
  rate_window_seconds integer
)
returns table(allowed boolean, retry_after integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  now_at timestamptz := clock_timestamp();
  stored_count integer;
  stored_window_start timestamptz;
begin
  if char_length(rate_action) not between 1 and 80
    or rate_key_hash !~ '^[0-9a-f]{64}$'
    or rate_limit not between 1 and 1000
    or rate_window_seconds not between 1 and 604800 then
    raise exception 'Invalid rate limit parameters';
  end if;

  insert into public.api_rate_limits as stored (
    action, key_hash, window_started_at, request_count
  ) values (
    rate_action, rate_key_hash, now_at, 1
  )
  on conflict (action, key_hash) do update set
    request_count = case
      when stored.window_started_at <= now_at - make_interval(secs => rate_window_seconds)
        then 1
      else stored.request_count + 1
    end,
    window_started_at = case
      when stored.window_started_at <= now_at - make_interval(secs => rate_window_seconds)
        then now_at
      else stored.window_started_at
    end
  returning stored.request_count, stored.window_started_at
    into stored_count, stored_window_start;

  return query select
    stored_count <= rate_limit,
    greatest(
      1,
      ceil(extract(epoch from (
        stored_window_start + make_interval(secs => rate_window_seconds) - now_at
      )))::integer
    );
end;
$$;

revoke all on function public.consume_api_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, text, integer, integer)
  to service_role;

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
  registration_open boolean;
  occupied_places integer;
  assigned_status text;
begin
  workshop_capacity := case participant_workshop
    when 'vibecoding-kg' then 12
    when 'vibecoding' then 12
    when 'token-economics' then 16
    else null
  end;

  if workshop_capacity is null then
    raise exception 'Unknown workshop';
  end if;

  -- The August 2026 cohort is closed. New applications go to the waitlist.
  registration_open := case participant_workshop
    when 'vibecoding-kg' then false
    when 'vibecoding' then false
    when 'token-economics' then false
    else false
  end;

  -- Serialize registrations per workshop so concurrent requests cannot overbook it.
  perform pg_advisory_xact_lock(hashtext(participant_workshop));

  select count(*) into occupied_places
  from public.workshop_registrations
  where workshop = participant_workshop
    and status in ('new', 'confirmed');

  assigned_status := case
    when not registration_open then 'next_run'
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

create or replace function public.register_workshop_participant_secure(
  participant_name text,
  participant_contact text,
  participant_telegram text,
  participant_workshop text,
  participant_source text,
  participant_telegram_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_status text;
  assigned_status text;
begin
  if participant_name is null
    or char_length(participant_name) not between 2 and 120
    or participant_contact is null
    or char_length(participant_contact) not between 5 and 200
    or participant_workshop is null
    or participant_workshop not in ('vibecoding-kg', 'vibecoding', 'token-economics')
    or participant_telegram_token_hash is null
    or participant_telegram_token_hash !~ '^[0-9a-f]{64}$'
    or (
      participant_telegram is not null
      and char_length(participant_telegram) not between 5 and 33
    ) then
    raise exception 'Invalid registration fields';
  end if;

  -- Prevent concurrent duplicate registrations for the same email and workshop.
  perform pg_advisory_xact_lock(
    hashtextextended(lower(participant_contact) || ':' || participant_workshop, 0)
  );

  select status into existing_status
  from public.workshop_registrations
  where workshop = participant_workshop
    and lower(contact) = lower(participant_contact)
    and status in ('new', 'confirmed', 'next_run')
  order by created_at desc
  limit 1;

  if existing_status is not null then
    return jsonb_build_object('status', existing_status, 'created', false);
  end if;

  assigned_status := public.register_workshop_participant(
    participant_name,
    participant_contact,
    participant_telegram,
    participant_workshop,
    participant_source,
    participant_telegram_token_hash
  );

  return jsonb_build_object('status', assigned_status, 'created', true);
end;
$$;

revoke all on function public.register_workshop_participant_secure(text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.register_workshop_participant_secure(text, text, text, text, text, text)
  to service_role;

create or replace function public.register_workshop_participant_secure_v2(
  participant_name text,
  participant_contact text,
  participant_telegram text,
  participant_workshop text,
  participant_source text,
  participant_telegram_token_hash text,
  participant_guide_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_id uuid;
  existing_status text;
  created_id uuid;
  assigned_status text;
begin
  if participant_name is null
    or char_length(participant_name) not between 2 and 120
    or participant_contact is null
    or char_length(participant_contact) not between 5 and 200
    or participant_workshop is null
    or participant_workshop not in ('vibecoding-kg', 'vibecoding', 'token-economics')
    or participant_telegram_token_hash is null
    or participant_telegram_token_hash !~ '^[0-9a-f]{64}$'
    or participant_guide_token_hash is null
    or participant_guide_token_hash !~ '^[0-9a-f]{64}$'
    or (
      participant_telegram is not null
      and char_length(participant_telegram) not between 5 and 33
    ) then
    raise exception 'Invalid registration fields';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(lower(participant_contact) || ':' || participant_workshop, 0)
  );

  select id, status into existing_id, existing_status
  from public.workshop_registrations
  where workshop = participant_workshop
    and lower(contact) = lower(participant_contact)
    and status in ('new', 'confirmed', 'next_run')
  order by created_at desc
  limit 1;

  if existing_id is not null then
    return jsonb_build_object('id', existing_id, 'status', existing_status, 'created', false);
  end if;

  assigned_status := public.register_workshop_participant(
    participant_name,
    participant_contact,
    participant_telegram,
    participant_workshop,
    participant_source,
    participant_telegram_token_hash
  );

  select id into created_id
  from public.workshop_registrations
  where telegram_start_token_hash = participant_telegram_token_hash
  limit 1;

  if created_id is null then
    raise exception 'Registration insert failed';
  end if;

  update public.workshop_registrations
  set guide_access_token_hash = participant_guide_token_hash
  where id = created_id;

  return jsonb_build_object('id', created_id, 'status', assigned_status, 'created', true);
end;
$$;

revoke all on function public.register_workshop_participant_secure_v2(text, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.register_workshop_participant_secure_v2(text, text, text, text, text, text, text)
  to service_role;

create unique index if not exists workshop_registrations_telegram_start_token_idx
  on public.workshop_registrations (telegram_start_token_hash)
  where telegram_start_token_hash is not null;

create unique index if not exists workshop_registrations_guide_access_token_idx
  on public.workshop_registrations (guide_access_token_hash)
  where guide_access_token_hash is not null;

create index if not exists workshop_registrations_contact_workshop_idx
  on public.workshop_registrations (lower(contact), workshop);

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

create or replace function public.claim_telegram_registration(
  participant_token_hash text,
  participant_chat_id bigint
)
returns table(id uuid, name text, workshop text, status text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if participant_token_hash !~ '^[0-9a-f]{64}$'
    or participant_chat_id is null
    or participant_chat_id = 0 then
    raise exception 'Invalid Telegram claim';
  end if;

  return query
  update public.workshop_registrations as registration
  set
    telegram_chat_id = participant_chat_id,
    telegram_start_token_hash = null,
    updated_at = now()
  where registration.telegram_start_token_hash = participant_token_hash
  returning registration.id, registration.name, registration.workshop, registration.status;
end;
$$;

revoke all on function public.claim_telegram_registration(text, bigint)
  from public, anon, authenticated;
grant execute on function public.claim_telegram_registration(text, bigint)
  to service_role;

create index if not exists crm_telegram_messages_participant_created_at_idx
  on public.crm_telegram_messages (participant_id, created_at desc);

-- The website writes through a route handler using the service role.
-- No public read/write policies are intentionally created.
create index if not exists workshop_registrations_created_at_idx
  on public.workshop_registrations (created_at desc);

-- Make the new table immediately visible to the Supabase Data API.
notify pgrst, 'reload schema';
