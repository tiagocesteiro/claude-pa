create table public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id),
  maker_id uuid not null references public.profiles(id),
  listing_id uuid not null references public.maker_listings(id),
  quantity integer default 1,
  unit_price decimal(10,2) not null,
  delivery_fee decimal(10,2) default 0,
  total_price decimal(10,2) not null,
  status text default 'pending'
    check (status in ('pending','confirmed','printing','shipped','delivered','cancelled')),
  delivery_address jsonb,
  payment_method text default 'mbway' check (payment_method in ('mbway','transfer')),
  payment_status text default 'pending' check (payment_status in ('pending','paid')),
  tracking_number text,
  tracking_carrier text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.orders enable row level security;
create policy "Buyers can view their own orders"
  on public.orders for select using (auth.uid() = buyer_id);
create policy "Makers can view orders assigned to them"
  on public.orders for select using (auth.uid() = maker_id);
create policy "Buyers can create orders"
  on public.orders for insert with check (auth.uid() = buyer_id);
create policy "Makers can update their orders"
  on public.orders for update using (auth.uid() = maker_id);

create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger orders_updated_at before update on public.orders
  for each row execute procedure public.update_updated_at();
