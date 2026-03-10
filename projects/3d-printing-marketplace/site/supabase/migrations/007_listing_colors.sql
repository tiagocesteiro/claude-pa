alter table public.maker_listings
  add column if not exists colors text[] default '{}';
