CREATE OR REPLACE FUNCTION public.next_order_number()
RETURNS text LANGUAGE plpgsql AS $fn$
BEGIN
  RETURN 'PS-' || lpad(nextval('public.order_number_seq')::text, 2, '0');
END;
$fn$;

-- Scheduled HTTP hooks are installed by the credential-backed scheduler migration.
