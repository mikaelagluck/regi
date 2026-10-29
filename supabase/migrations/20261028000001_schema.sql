-- regi v1 schema — PRD Part C2 (data model), C5.1 (indexes), C6.1 (RLS).
-- Additions beyond C2 are marked "ADD:" and logged in DECISIONS.md.

-- ───────────────────────── enums ─────────────────────────
create type public.step_type as enum (
  'cleanse', 'treat', 'moisturize', 'protect', 'mask', 'massage', 'tool', 'mist', 'apply'
);
create type public.product_state as enum ('using', 'empty', 'wishlist');
create type public.time_of_day as enum ('morning', 'midday', 'evening');
create type public.schedule_type as enum ('standard', 'temporary');
create type public.share_entity_type as enum ('regimen', 'user_product', 'products_list');
create type public.notification_kind as enum ('timer', 'reminder', 'share_activity'); -- ADD

-- ───────────────────────── helpers ─────────────────────────
create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ───────────────────────── users (C2.2) ─────────────────────────
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  -- Nullable only between auth signup and the username screen [signup-02]; the app gates on it.
  username text unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text check (char_length(display_name) <= 60),
  avatar_url text,
  timezone text not null default 'UTC',                    -- ADD: IANA tz for logicalDate()
  current_streak_days integer not null default 0,
  longest_streak_days integer not null default 0,
  lifetime_regimens_completed integer not null default 0,
  streak_evaluated_on date,                                 -- ADD: rollover idempotency
  notify_regimen_reminders boolean not null default true,   -- ADD: B8.3 toggles
  notify_timer_alerts boolean not null default true,
  notify_share_activity boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger users_updated_at before update on public.users
  for each row execute function public.set_updated_at();

-- ───────────────────────── categories (C2.3) ─────────────────────────
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  step_type public.step_type not null,
  display_order integer not null default 0
);

-- ───────────────────────── user_products (C2.4) ─────────────────────────
create table public.user_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  brand text not null check (char_length(brand) between 1 and 80),
  name text not null check (char_length(name) between 1 and 120),
  category_id uuid not null references public.categories (id),
  image_url text,
  state public.product_state not null default 'using',
  star_rating integer check (star_rating between 0 and 5),
  notes text,
  affiliate_url text,
  started_on date,
  finished_on date,
  repurchase_count integer not null default 0 check (repurchase_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index user_products_user_state_idx on public.user_products (user_id, state);
create index user_products_user_category_idx on public.user_products (user_id, category_id);
create index user_products_brand_idx on public.user_products (user_id, brand);
create index user_products_name_idx on public.user_products (user_id, name);
create trigger user_products_updated_at before update on public.user_products
  for each row execute function public.set_updated_at();

-- ───────────────────────── user_product_history (C2.5) ─────────────────────────
create table public.user_product_history (
  id uuid primary key default gen_random_uuid(),
  user_product_id uuid not null references public.user_products (id) on delete cascade,
  started_on date,
  finished_on date,
  star_rating_at_completion integer check (star_rating_at_completion between 0 and 5),
  notes_at_completion text,
  created_at timestamptz not null default now()
);
create index user_product_history_product_idx on public.user_product_history (user_product_id);

-- ───────────────────────── regimens (C2.6) ─────────────────────────
create table public.regimens (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  time_of_day public.time_of_day not null,
  target_user_label text check (char_length(target_user_label) <= 40),
  reminder_time time,
  is_archived boolean not null default false,
  cloned_from_regimen_id uuid references public.regimens (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index regimens_owner_idx on public.regimens (owner_user_id, is_archived);
create trigger regimens_updated_at before update on public.regimens
  for each row execute function public.set_updated_at();

-- ───────────────────────── regimen_steps (C2.7) ─────────────────────────
create table public.regimen_steps (
  id uuid primary key default gen_random_uuid(),
  regimen_id uuid not null references public.regimens (id) on delete cascade,
  position integer not null,
  user_product_id uuid references public.user_products (id) on delete set null,
  free_text_label text check (char_length(free_text_label) <= 120),
  step_type public.step_type not null,
  wait_seconds_after integer not null default 0 check (wait_seconds_after between 0 and 7200),
  notes text,
  -- ADD: copy-on-write versioning so template edits never rewrite past days ("history is inviolate").
  -- A step applies to logical date D when (active_from is null or active_from <= D)
  -- and (active_until is null or D < active_until).
  active_from date,
  active_until date,
  check (user_product_id is not null or free_text_label is not null)
);
create index regimen_steps_regimen_position_idx on public.regimen_steps (regimen_id, position);

-- ───────────────────────── schedule_assignments (C2.8) ─────────────────────────
create table public.schedule_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  regimen_id uuid not null references public.regimens (id) on delete cascade,
  schedule_type public.schedule_type not null,
  recurrence_rule text not null,
  start_date date,
  end_date date,
  priority integer not null default 0,
  time_of_day public.time_of_day not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);
create index schedule_assignments_resolution_idx
  on public.schedule_assignments (user_id, time_of_day, start_date, end_date);
create index schedule_assignments_regimen_idx on public.schedule_assignments (regimen_id);
create trigger schedule_assignments_updated_at before update on public.schedule_assignments
  for each row execute function public.set_updated_at();

-- Enforce "time_of_day must match regimen's" (C2.8).
create function public.schedule_tod_matches_regimen() returns trigger
language plpgsql as $$
begin
  if new.time_of_day <> (select time_of_day from public.regimens where id = new.regimen_id) then
    raise exception 'schedule time_of_day must match regimen time_of_day';
  end if;
  return new;
end;
$$;
create trigger schedule_assignments_tod before insert or update on public.schedule_assignments
  for each row execute function public.schedule_tod_matches_regimen();

-- ───────────────────────── regimen_instances (C2.9) ─────────────────────────
create table public.regimen_instances (
  id uuid primary key default gen_random_uuid(),
  regimen_id uuid not null references public.regimens (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  date date not null,
  completed_at timestamptz,
  skipped boolean not null default false,
  journal_note text,
  selfie_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (regimen_id, date)
);
create index regimen_instances_user_date_idx on public.regimen_instances (user_id, date);
create trigger regimen_instances_updated_at before update on public.regimen_instances
  for each row execute function public.set_updated_at();

-- ───────────────────────── regimen_step_instances (C2.10) ─────────────────────────
create table public.regimen_step_instances (
  id uuid primary key default gen_random_uuid(),
  regimen_instance_id uuid not null references public.regimen_instances (id) on delete cascade,
  regimen_step_id uuid references public.regimen_steps (id) on delete set null,
  override_position integer,
  override_label text,
  override_user_product_id uuid references public.user_products (id) on delete set null,
  override_step_type public.step_type,          -- ADD: for steps added for one day
  override_wait_seconds integer,                -- ADD
  is_added_for_this_day boolean not null default false,
  is_removed_for_this_day boolean not null default false,
  timer_started_at timestamptz,
  checked_at timestamptz,
  reaction_tags text[] not null default '{}',
  reaction_note text,
  created_at timestamptz not null default now()
);
create index regimen_step_instances_instance_idx on public.regimen_step_instances (regimen_instance_id);
create index regimen_step_instances_timer_idx on public.regimen_step_instances (regimen_instance_id)
  where timer_started_at is not null;
create unique index regimen_step_instances_step_unique
  on public.regimen_step_instances (regimen_instance_id, regimen_step_id)
  where regimen_step_id is not null;

-- ───────────────────────── share_artifacts (C2.11) ─────────────────────────
create table public.share_artifacts (
  id uuid primary key default gen_random_uuid(),
  share_slug text not null unique check (share_slug ~ '^[A-Za-z0-9_-]{6,32}$'),
  creator_user_id uuid not null references public.users (id) on delete cascade,
  entity_type public.share_entity_type not null,
  entity_id uuid not null,
  description text check (char_length(description) <= 500),
  is_active boolean not null default true,
  view_count integer not null default 0,
  copy_count integer not null default 0,
  link_click_count integer not null default 0,
  created_at timestamptz not null default now(),
  revoked_at timestamptz                        -- ADD: "revoked Mar 12" in [my-shares]
);
create index share_artifacts_creator_idx on public.share_artifacts (creator_user_id, created_at desc);

-- ADD: per-viewer-per-day dedupe for view tracking ("rate-limited", C4.6).
create table public.share_views (
  share_id uuid not null references public.share_artifacts (id) on delete cascade,
  viewer_key text not null,
  viewed_on date not null default current_date,
  primary key (share_id, viewer_key, viewed_on)
);

-- ADD: Web Push (CLAUDE.md platform translation for APNs).
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

create table public.scheduled_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  kind public.notification_kind not null,
  send_at timestamptz not null,
  title text not null,
  body text not null,
  url text,
  dedupe_key text unique,
  sent_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);
create index scheduled_notifications_due_idx on public.scheduled_notifications (send_at)
  where sent_at is null and cancelled_at is null;

-- ───────────────────────── new auth user → profile row ─────────────────────────
create function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.users (id, display_name, avatar_url)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 60),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_auth_user();
