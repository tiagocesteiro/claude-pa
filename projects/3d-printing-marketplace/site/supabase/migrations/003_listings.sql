create table public.maker_listings (
  id uuid primary key default gen_random_uuid(),
  maker_id uuid not null references public.profiles(id) on delete cascade,
  model_id text not null references public.models(id) on delete cascade,
  price decimal(10,2) not null,
  currency text default 'EUR',
  print_time_days integer default 3,
  is_active boolean default true,
  created_at timestamptz default now(),
  unique(maker_id, model_id)
);

alter table public.maker_listings enable row level security;
create policy "Active listings are viewable by everyone"
  on public.maker_listings for select using (is_active = true);
create policy "Makers can manage their own listings"
  on public.maker_listings for all using (auth.uid() = maker_id);
