ALTER TABLE public.promotion_products
  ADD COLUMN IF NOT EXISTS discount_type text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS discount_value numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_before numeric,
  ADD COLUMN IF NOT EXISTS compare_before numeric;

ALTER TABLE public.promotion_products
  DROP CONSTRAINT IF EXISTS promotion_products_discount_type_check;
ALTER TABLE public.promotion_products
  ADD CONSTRAINT promotion_products_discount_type_check
  CHECK (discount_type IN ('none','percent','flat','fixed_price'));