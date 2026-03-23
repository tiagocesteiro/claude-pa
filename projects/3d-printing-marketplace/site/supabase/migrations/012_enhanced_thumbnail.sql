-- Add enhanced_thumbnail column to store AI-generated studio photos
alter table public.models add column if not exists enhanced_thumbnail text;

-- Create storage bucket for model images (public)
insert into storage.buckets (id, name, public)
values ('model-images', 'model-images', true)
on conflict (id) do nothing;

-- Allow public read on model-images bucket
create policy "Model images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'model-images');

-- Allow service role to upload
create policy "Service role can upload model images"
  on storage.objects for insert
  with check (bucket_id = 'model-images');
