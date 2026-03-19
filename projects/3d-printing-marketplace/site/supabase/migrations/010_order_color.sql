-- Add color selection to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS color text;
