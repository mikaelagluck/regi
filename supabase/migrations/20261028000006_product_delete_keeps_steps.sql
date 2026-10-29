-- Deleting a product must not break (or blank out) regimen steps or past days that used it.
-- Before the row goes, linked steps and per-day overrides become free-text "Brand Name".
create function public.detach_product_before_delete() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.regimen_steps
     set free_text_label = coalesce(free_text_label, left(old.brand || ' ' || old.name, 120)), user_product_id = null
   where user_product_id = old.id;
  update public.regimen_step_instances
     set override_label = coalesce(override_label, left(old.brand || ' ' || old.name, 120)), override_user_product_id = null
   where override_user_product_id = old.id;
  return old;
end;
$$;
create trigger user_products_detach before delete on public.user_products
  for each row execute function public.detach_product_before_delete();
