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
