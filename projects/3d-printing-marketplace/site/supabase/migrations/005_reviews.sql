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
