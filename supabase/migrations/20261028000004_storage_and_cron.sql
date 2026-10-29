-- Supabase-only infrastructure. Each block is guarded so the same migrations also apply to the
-- Docker-free local database (PGlite), which has no storage schema, pg_cron or pg_net.

-- Product photos bucket (C1.2): per-user prefix "<uid>/<file>". Public read (unguessable paths),
-- writes restricted to the owner's own folder.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('product-photos', 'product-photos', true, 5242880,
            array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
    on conflict (id) do nothing;

    execute $p$create policy "product photos owner insert" on storage.objects for insert to authenticated
      with check (bucket_id = 'product-photos' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
    execute $p$create policy "product photos owner update" on storage.objects for update to authenticated
      using (bucket_id = 'product-photos' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
    execute $p$create policy "product photos owner delete" on storage.objects for delete to authenticated
      using (bucket_id = 'product-photos' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
  end if;
end;
$$;

-- Scheduled jobs (Supabase Cron = pg_cron + pg_net). The streak/rollover logic needs the RRULE
-- resolver, which lives in TypeScript (src/lib), so the cron job calls the app's protected
-- endpoints. After deploying, run once in the SQL editor:
--   select public.regi_schedule_jobs('https://<your-domain>', '<CRON_SECRET>');
create function public.regi_schedule_jobs(p_site_url text, p_cron_secret text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron')
     or not exists (select 1 from pg_extension where extname = 'pg_net') then
    raise exception 'enable the pg_cron and pg_net extensions first (Database → Extensions)';
  end if;
  -- Hourly: users whose local time just passed 4am get their previous logical day evaluated.
  perform cron.schedule('regi-rollover', '5 * * * *', format(
    $c$select net.http_post(url := %L, headers := jsonb_build_object('authorization', %L))$c$,
    p_site_url || '/api/cron/rollover', 'Bearer ' || p_cron_secret));
  -- Every minute: dispatch due Web Push notifications (wait timers, reminders, share activity).
  perform cron.schedule('regi-notifications', '* * * * *', format(
    $c$select net.http_post(url := %L, headers := jsonb_build_object('authorization', %L))$c$,
    p_site_url || '/api/cron/notifications', 'Bearer ' || p_cron_secret));
end;
$$;
revoke execute on function public.regi_schedule_jobs(text, text) from public, anon, authenticated;
