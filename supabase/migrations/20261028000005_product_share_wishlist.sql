-- B7.5 for product shares (/p/[slug], CLAUDE.md conflict #10): add the shared product to the
-- caller's wishlist, keeping brand, name, category and affiliate URL. Counts as a copy.
create function public.wishlist_from_product_share(p_slug text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_new uuid;
  v_share uuid;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  insert into public.user_products (user_id, brand, name, category_id, state, affiliate_url)
  select v_uid, p.brand, p.name, p.category_id, 'wishlist', p.affiliate_url
    from public.share_artifacts s
    join public.user_products p on p.id = s.entity_id
   where s.share_slug = p_slug and s.is_active and s.entity_type = 'user_product'
  returning id into v_new;
  if v_new is null then raise exception 'share not found' using errcode = 'P0002'; end if;
  select id into v_share from public.share_artifacts where share_slug = p_slug;
  update public.share_artifacts set copy_count = copy_count + 1 where id = v_share;
  return v_new;
end;
$$;
revoke execute on function public.wishlist_from_product_share(text) from public, anon;
grant execute on function public.wishlist_from_product_share(text) to authenticated;
