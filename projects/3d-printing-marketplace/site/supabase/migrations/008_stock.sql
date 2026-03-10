-- Add stock and print time fields to maker_listings
ALTER TABLE public.maker_listings
  ADD COLUMN IF NOT EXISTS stock_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS print_time_hours integer DEFAULT 24;

-- Trigger: decrement stock by 1 when an order is created (if stock > 0)
CREATE OR REPLACE FUNCTION public.decrement_listing_stock()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.maker_listings
  SET stock_count = GREATEST(0, stock_count - 1)
  WHERE id = NEW.listing_id
    AND stock_count > 0;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_decrement_stock ON public.orders;
CREATE TRIGGER trg_decrement_stock
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_listing_stock();
