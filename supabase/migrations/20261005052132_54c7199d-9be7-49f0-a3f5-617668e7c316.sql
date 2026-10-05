REVOKE EXECUTE ON FUNCTION public.sync_product_stock(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_sync_stock_levels() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_sync_stock_variants() FROM PUBLIC, anon, authenticated;