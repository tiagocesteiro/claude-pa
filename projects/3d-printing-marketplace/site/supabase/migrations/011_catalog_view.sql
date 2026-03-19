-- Add cached order_count to models (avoids RLS bypass complexity)
alter table public.models add column if not exists order_count integer default 0;

-- Function: recalculate order_count for a model when an order changes
create or replace function public.update_model_order_count()
returns trigger language plpgsql security definer as $$
declare v_model_id text;
begin
  select ml.model_id into v_model_id
  from public.maker_listings ml
  where ml.id = coalesce(new.listing_id, old.listing_id);

  if v_model_id is not null then
    update public.models
    set order_count = (
      select count(*)
      from public.orders o
      join public.maker_listings ml on ml.id = o.listing_id
      where ml.model_id = v_model_id
      and o.status != 'cancelled'
    )
    where id = v_model_id;
  end if;

  return coalesce(new, old);
end;
$$;

create trigger orders_update_model_count
after insert or update of status or delete on public.orders
for each row execute function public.update_model_order_count();

-- View: only models that have at least one active maker listing
-- (replaces querying models directly in the catalog)
create or replace view public.catalog_models as
select
  m.*,
  count(distinct ml.id)::integer as maker_count,
  min(ml.price) as min_price
from public.models m
inner join public.maker_listings ml on ml.model_id = m.id and ml.is_active = true
where m.is_active = true
group by m.id;

grant select on public.catalog_models to anon, authenticated;
