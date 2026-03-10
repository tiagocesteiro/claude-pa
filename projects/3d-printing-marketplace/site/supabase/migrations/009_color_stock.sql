-- Per-color stock on maker_listings
-- color_stock: {"White": 3, "Black": 0, "Red": 5}
-- Keys = colors the maker offers, values = units currently in stock (0 = print on demand)
ALTER TABLE public.maker_listings
  ADD COLUMN IF NOT EXISTS color_stock jsonb DEFAULT '{}';

-- Print settings cache on models (fetched from Printables, stored to avoid re-fetching)
ALTER TABLE public.models
  ADD COLUMN IF NOT EXISTS print_settings jsonb;

-- Allow the print_settings column to be updated (API route caches it)
CREATE POLICY IF NOT EXISTS "Models print_settings are updatable" ON public.models
  FOR UPDATE USING (true) WITH CHECK (true);
