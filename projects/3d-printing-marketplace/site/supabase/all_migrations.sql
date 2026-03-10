create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('buyer', 'maker', 'both')) default 'buyer',
  display_name text not null,
  bio text,
  avatar_url text,
  location_city text,
  location_lat float,
  location_lng float,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'buyer')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
create table public.models (
  id text primary key,
  name text not null,
  summary text,
  url text not null,
  thumbnail text,
  license_id text,
  license_name text,
  creator_username text,
  creator_url text,
  likes integer default 0,
  makes integer default 0,
  category_id text,
  category_name text,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.models enable row level security;
create policy "Models are viewable by everyone" on public.models for select using (true);
create policy "Only service role can insert models" on public.models for insert with check (false);
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
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) unique,
  reviewer_id uuid not null references public.profiles(id),
  reviewee_id uuid not null references public.profiles(id),
  quality_rating integer check (quality_rating between 1 and 5),
  delivery_rating integer check (delivery_rating between 1 and 5),
  comment text,
  created_at timestamptz default now()
);

alter table public.reviews enable row level security;
create policy "Reviews are viewable by everyone" on public.reviews for select using (true);
create policy "Buyers can create reviews for their orders"
  on public.reviews for insert with check (auth.uid() = reviewer_id);
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id),
  maker_id uuid not null references public.profiles(id),
  order_id uuid references public.orders(id),
  created_at timestamptz default now(),
  unique(buyer_id, maker_id, order_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  content text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

alter table public.conversations enable row level security;
create policy "Participants can view their conversations"
  on public.conversations for select
  using (auth.uid() = buyer_id or auth.uid() = maker_id);
create policy "Users can create conversations"
  on public.conversations for insert
  with check (auth.uid() = buyer_id or auth.uid() = maker_id);

alter table public.messages enable row level security;
create policy "Participants can view messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
      and (c.buyer_id = auth.uid() or c.maker_id = auth.uid())
    )
  );
create policy "Participants can send messages"
  on public.messages for insert
  with check (auth.uid() = sender_id);
