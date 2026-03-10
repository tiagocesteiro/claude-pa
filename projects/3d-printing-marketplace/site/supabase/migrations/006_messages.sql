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
