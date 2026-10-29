-- Row-Level Security — PRD C6.1. RLS does authorization; the app never duplicates ownership checks.
-- Public share access goes through SECURITY DEFINER functions keyed by slug (so unlisted shares
-- can't be enumerated), and they never return journal notes or product notes (C6.2).

alter table public.regimen_steps add column reference_url text; -- ADD: source affiliate URL kept on copied steps (B7.4)

alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.user_products enable row level security;
alter table public.user_product_history enable row level security;
alter table public.regimens enable row level security;
alter table public.regimen_steps enable row level security;
alter table public.schedule_assignments enable row level security;
alter table public.regimen_instances enable row level security;
alter table public.regimen_step_instances enable row level security;
alter table public.share_artifacts enable row level security;
alter table public.share_views enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.scheduled_notifications enable row level security;

-- ───────────── grants (explicit; Supabase's default "grant all" is revoked) ─────────────
revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;

grant select on public.categories to anon, authenticated;
grant select on public.users to authenticated;
grant update (display_name, avatar_url, timezone,
              notify_regimen_reminders, notify_timer_alerts, notify_share_activity)
  on public.users to authenticated;
grant select, insert, update, delete on
  public.user_products, public.user_product_history, public.regimens, public.regimen_steps,
  public.schedule_assignments, public.regimen_instances, public.regimen_step_instances,
  public.push_subscriptions, public.scheduled_notifications
  to authenticated;
grant select, insert on public.share_artifacts to authenticated;
grant update (description, is_active, revoked_at) on public.share_artifacts to authenticated;

-- ───────────── policies ─────────────
create policy users_own on public.users
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy categories_read on public.categories
  for select to anon, authenticated using (true);

create policy user_products_own on public.user_products
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy user_product_history_own on public.user_product_history
  for all to authenticated
  using (exists (select 1 from public.user_products p where p.id = user_product_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.user_products p where p.id = user_product_id and p.user_id = auth.uid()));

create policy regimens_own on public.regimens
  for all to authenticated using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

create policy regimen_steps_own on public.regimen_steps
  for all to authenticated
  using (exists (select 1 from public.regimens r where r.id = regimen_id and r.owner_user_id = auth.uid()))
  with check (exists (select 1 from public.regimens r where r.id = regimen_id and r.owner_user_id = auth.uid()) and (user_product_id is null or exists (select 1 from public.user_products p where p.id = user_product_id and p.user_id = auth.uid())));

create policy schedule_assignments_own on public.schedule_assignments
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and exists (select 1 from public.regimens r where r.id = regimen_id and r.owner_user_id = auth.uid()));

create policy regimen_instances_own on public.regimen_instances
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and exists (select 1 from public.regimens r where r.id = regimen_id and r.owner_user_id = auth.uid()));

create policy regimen_step_instances_own on public.regimen_step_instances
  for all to authenticated
  using (exists (select 1 from public.regimen_instances i where i.id = regimen_instance_id and i.user_id = auth.uid()))
  with check (exists (select 1 from public.regimen_instances i where i.id = regimen_instance_id and i.user_id = auth.uid())
              and (override_user_product_id is null or exists (select 1 from public.user_products p where p.id = override_user_product_id and p.user_id = auth.uid())));

create policy share_artifacts_own_read on public.share_artifacts
  for select to authenticated using (creator_user_id = auth.uid());
create policy share_artifacts_own_insert on public.share_artifacts
  for insert to authenticated with check (
    creator_user_id = auth.uid() and (
      (entity_type = 'regimen' and exists (select 1 from public.regimens r where r.id = entity_id and r.owner_user_id = auth.uid()))
      or (entity_type = 'user_product' and exists (select 1 from public.user_products p where p.id = entity_id and p.user_id = auth.uid()))
    ));
create policy share_artifacts_own_update on public.share_artifacts
  for update to authenticated using (creator_user_id = auth.uid()) with check (creator_user_id = auth.uid());
-- share_views: no policies → no direct access; written only by track_share_view().

create policy push_subscriptions_own on public.push_subscriptions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy scheduled_notifications_own on public.scheduled_notifications
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ───────────── functions ─────────────

-- [signup-02] real-time availability check. Usernames are public by design (shown on shares).
create function public.username_available(p_username text) returns boolean
language sql stable security definer set search_path = '' as $$
  select lower(p_username) ~ '^[a-z0-9_]{3,20}$'
     and not exists (select 1 from public.users where username = lower(p_username));
$$;

-- [signup-02] set username once (not editable later, B2.1).
create function public.claim_username(p_username text, p_display_name text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if lower(p_username) !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'invalid username' using errcode = '22023';
  end if;
  update public.users
     set username = lower(p_username),
         display_name = coalesce(nullif(trim(p_display_name), ''), display_name)
   where id = v_uid and username is null;
  if not found then
    raise exception 'username already set' using errcode = '42501';
  end if;
exception when unique_violation then
  raise exception 'username taken' using errcode = '23505';
end;
$$;

-- B7.2 public share payload. Never includes journal notes or product notes (C6.2).
create function public.public_share(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  s public.share_artifacts;
  creator jsonb;
  result jsonb;
begin
  select * into s from public.share_artifacts where share_slug = p_slug and is_active;
  if not found then return null; end if;

  select jsonb_build_object('username', u.username, 'display_name', u.display_name, 'avatar_url', u.avatar_url)
    into creator from public.users u where u.id = s.creator_user_id;

  result := jsonb_build_object(
    'id', s.id, 'slug', s.share_slug, 'entity_type', s.entity_type, 'description', s.description,
    'view_count', s.view_count, 'copy_count', s.copy_count, 'created_at', s.created_at,
    'creator', creator
  );

  if s.entity_type = 'regimen' then
    return result || (
      select jsonb_build_object(
        'regimen', jsonb_build_object('name', r.name, 'time_of_day', r.time_of_day),
        'steps', coalesce((
          select jsonb_agg(jsonb_build_object(
                   'id', st.id,
                   'position', st.position,
                   'step_type', st.step_type,
                   'brand', p.brand,
                   'product_name', p.name,
                   'label', coalesce(p.name, st.free_text_label),
                   'wait_seconds_after', st.wait_seconds_after,
                   'notes', st.notes,
                   'affiliate_url', coalesce(p.affiliate_url, st.reference_url)
                 ) order by st.position)
            from public.regimen_steps st
            left join public.user_products p on p.id = st.user_product_id
           where st.regimen_id = r.id and st.active_until is null
        ), '[]'::jsonb)
      )
      from public.regimens r where r.id = s.entity_id
    );
  elsif s.entity_type = 'user_product' then
    return result || (
      select jsonb_build_object('product', jsonb_build_object(
        'brand', p.brand, 'name', p.name, 'category', c.name, 'step_type', c.step_type,
        'star_rating', p.star_rating, 'affiliate_url', p.affiliate_url, 'image_url', p.image_url))
      from public.user_products p join public.categories c on c.id = p.category_id
      where p.id = s.entity_id
    );
  end if;
  return result;
end;
$$;

-- C4.6 track-view, deduped per viewer per day.
create function public.track_share_view(p_slug text, p_viewer_key text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  select id into v_id from public.share_artifacts where share_slug = p_slug and is_active;
  if v_id is null then return; end if;
  insert into public.share_views (share_id, viewer_key) values (v_id, left(p_viewer_key, 64))
  on conflict do nothing;
  if found then
    update public.share_artifacts set view_count = view_count + 1 where id = v_id;
  end if;
end;
$$;

create function public.track_share_link_click(p_slug text) returns void
language sql security definer set search_path = '' as $$
  update public.share_artifacts set link_click_count = link_click_count + 1
   where share_slug = p_slug and is_active;
$$;

-- B7.4 copy behaviour: shelf-linked steps become free-text "Brand Name" steps.
create function public.copy_shared_regimen(p_slug text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  s public.share_artifacts;
  src public.regimens;
  v_new uuid;
  v_notify boolean;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select * into s from public.share_artifacts
   where share_slug = p_slug and is_active and entity_type = 'regimen';
  if not found then raise exception 'share not found' using errcode = 'P0002'; end if;
  select * into src from public.regimens where id = s.entity_id;

  insert into public.regimens (owner_user_id, name, time_of_day, cloned_from_regimen_id)
  values (v_uid, src.name, src.time_of_day, src.id)
  returning id into v_new;

  insert into public.regimen_steps
    (regimen_id, position, free_text_label, step_type, wait_seconds_after, notes, reference_url)
  select v_new, st.position,
         coalesce(trim(p.brand || ' ' || p.name), st.free_text_label),
         st.step_type, st.wait_seconds_after, st.notes,
         coalesce(p.affiliate_url, st.reference_url)
    from public.regimen_steps st
    left join public.user_products p on p.id = st.user_product_id
   where st.regimen_id = src.id and st.active_until is null
   order by st.position;

  update public.share_artifacts set copy_count = copy_count + 1 where id = s.id;

  select notify_share_activity into v_notify from public.users where id = s.creator_user_id;
  if v_notify and s.creator_user_id <> v_uid then
    insert into public.scheduled_notifications (user_id, kind, send_at, title, body, url)
    select s.creator_user_id, 'share_activity', now(), 'Someone copied your regimen',
           '@' || coalesce(u.username, 'someone') || ' copied ' || src.name || '.', '/profile/shares'
      from public.users u where u.id = v_uid;
  end if;
  return v_new;
end;
$$;

-- B7.5 wishlist add from a shared step (shelf-linked steps only; free-text has no brand).
create function public.wishlist_from_share(p_slug text, p_step_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_new uuid;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  insert into public.user_products (user_id, brand, name, category_id, state, affiliate_url)
  select v_uid, p.brand, p.name,
         coalesce(
           (select c.id from public.categories c where c.id = p.category_id),
           (select c.id from public.categories c where c.step_type = st.step_type order by c.display_order limit 1)
         ),
         'wishlist', p.affiliate_url
    from public.share_artifacts s
    join public.regimen_steps st on st.regimen_id = s.entity_id and st.id = p_step_id
    join public.user_products p on p.id = st.user_product_id
   where s.share_slug = p_slug and s.is_active and s.entity_type = 'regimen'
  returning id into v_new;
  if v_new is null then raise exception 'step not found' using errcode = 'P0002'; end if;
  return v_new;
end;
$$;

revoke execute on function public.claim_username(text, text) from public, anon;
revoke execute on function public.copy_shared_regimen(text) from public, anon;
revoke execute on function public.wishlist_from_share(text, uuid) from public, anon;
grant execute on function public.username_available(text) to anon, authenticated;
grant execute on function public.claim_username(text, text) to authenticated;
grant execute on function public.public_share(text) to anon, authenticated;
grant execute on function public.track_share_view(text, text) to anon, authenticated;
grant execute on function public.track_share_link_click(text) to anon, authenticated;
grant execute on function public.copy_shared_regimen(text) to authenticated;
grant execute on function public.wishlist_from_share(text, uuid) to authenticated;
